import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import type { ByokProvider } from '@/lib/byok/providers'
import {
  countPlatformRunContexts,
  decryptUserApiKeyRecords,
  resolveModelRunContexts,
} from '@/lib/byok/runtime'
import { getCanvasByIdAndUser } from '@/lib/db/canvas-queries'
import {
  createGenerationJobs,
  insertGeneratedImageResult,
  listRecentGenerationCountForUser,
  markGenerationJobCompleted,
  markGenerationJobFailed,
  preDeductQuota,
  rollbackQuotaDeduction,
} from '@/lib/db/generation-queries'
import { getDailyUsageCountForQuotaSource, getQuotaInfo } from '@/lib/db/queries'
import { listUserApiKeysForUser } from '@/lib/db/user-api-keys-queries'
import { parseGenerateRequest } from '@/lib/generation/request'
import { serializeSseEvent } from '@/lib/generation/sse'
import { getByokMasterKeyFromEnv } from '@/lib/crypto/byok'
import { getModelAdaptersForIds, runModelGeneration } from '@/lib/models/router'
import { closeStreamOnce } from '@/lib/sse/close-once'
import { uploadImage } from '@/lib/storage'

export const maxDuration = 300
export const runtime = 'nodejs'
const BYOK_DAILY_FAIR_USE_LIMIT = 200

type FailedJobEvent = {
  jobId: string
  modelId: string
  errorCode: string
  message: string
  durationMs: number
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

// Only expose safe, static error descriptions to the client.
// Raw provider messages may contain internal URLs or API details.
function getClientSafeErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'timeout': return 'Generation timed out'
    case 'rate_limited': return 'Provider rate limit exceeded'
    case 'misconfigured': return 'Model is not configured'
    case 'invalid_response': return 'Provider returned an invalid response'
    case 'provider_error': return 'Provider error'
    default: return 'Generation failed'
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }
  const userId = session.user.id

  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonError('Invalid request format', 400)
  }

  let parsed: ReturnType<typeof parseGenerateRequest>
  try {
    parsed = parseGenerateRequest(raw)
  } catch (error: unknown) {
    // parseGenerateRequest throws Error with controlled messages (field names, enum hints)
    return jsonError(
      error instanceof Error ? error.message : 'Invalid generate request',
      400
    )
  }

  if (parsed.canvasId) {
    const canvas = await getCanvasByIdAndUser(userId, parsed.canvasId)
    if (!canvas) {
      return jsonError('Canvas not found', 404)
    }
  }

  const perMinuteCount = await listRecentGenerationCountForUser(userId)
  if (perMinuteCount + parsed.modelIds.length > 60) {
    return jsonError('Rate limit exceeded', 429)
  }

  const groupId = randomUUID()
  const adapters = getModelAdaptersForIds(parsed.modelIds)
  const storedApiKeys = await listUserApiKeysForUser(userId)
  let providerKeys: Partial<Record<ByokProvider, string>> = {}
  if (storedApiKeys.length > 0) {
    try {
      providerKeys = decryptUserApiKeyRecords({
        records: storedApiKeys,
        userId,
        masterKeyHex: getByokMasterKeyFromEnv(),
      })
    } catch (error: unknown) {
      console.error('[generate] failed to resolve BYOK keys', error)
      return jsonError('BYOK key decryption unavailable', 500)
    }
  }
  const runContexts = resolveModelRunContexts(adapters, providerKeys)
  const platformModelCount = countPlatformRunContexts(runContexts)
  const byokModelCount = runContexts.length - platformModelCount

  if (platformModelCount > 0) {
    const quota = await getQuotaInfo(userId)
    if (
      quota.dailyUsed + platformModelCount > quota.dailyLimit ||
      quota.monthlyUsed + platformModelCount > quota.monthlyLimit
    ) {
      return jsonError('Quota exceeded', 403)
    }
  }

  if (byokModelCount > 0) {
    const byokUsedToday = await getDailyUsageCountForQuotaSource(userId, 'byok')
    if (byokUsedToday + byokModelCount > BYOK_DAILY_FAIR_USE_LIMIT) {
      return jsonError('BYOK fair use exceeded', 403)
    }
  }

  const preDeducted = await preDeductQuota({
    userId,
    action: 'generate',
    models: runContexts.map((context) => ({
      modelId: context.adapter.definition.id,
      provider: context.adapter.definition.provider,
      quotaSource: context.quotaSource,
    })),
    groupId,
    canvasId: parsed.canvasId,
  })
  const preDeductedIds = preDeducted.map((row) => row.id)

  let jobs: Awaited<ReturnType<typeof createGenerationJobs>>
  try {
    jobs = await createGenerationJobs({
      groupId,
      userId,
      canvasId: parsed.canvasId,
      prompt: parsed.prompt,
      aspectRatio: parsed.aspectRatio,
      models: runContexts.map((context) => ({
        modelId: context.adapter.definition.id,
        provider: context.adapter.definition.provider,
        quotaSource: context.quotaSource,
      })),
    })
  } catch (error: unknown) {
    await rollbackQuotaDeduction(preDeductedIds).catch(() => {})
    console.error('[generate] failed to initialize generation jobs', error)
    return jsonError('Failed to initialize generation jobs', 500)
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(serializeSseEvent(event, payload))
        )
      }

      send('started', {
        groupId,
        jobs: jobs.map((job) => ({
          jobId: job.id,
          modelId: job.modelId,
          provider: job.provider,
        })),
      })

      try {
        let successCount = 0
        await Promise.allSettled(
          jobs.map(async (job, index) => {
            const jobStartedAt = Date.now()
            const runContext = runContexts[index]
            const adapter = runContext?.adapter
            try {
              if (!adapter || !runContext) {
                await markGenerationJobFailed(job.id, userId, {
                  errorCode: 'provider_error',
                  error: 'Adapter not found for job',
                  durationMs: 0,
                })
                send('job_failed', {
                  jobId: job.id,
                  modelId: job.modelId,
                  errorCode: 'provider_error',
                  message: 'Model adapter unavailable',
                  durationMs: 0,
                })
                return
              }
              const result = await runModelGeneration({
                adapter,
                options: {
                  prompt: parsed.prompt,
                  aspectRatio: parsed.aspectRatio,
                  apiKey: runContext.apiKey,
                },
              })

              if (!result.ok) {
                await markGenerationJobFailed(job.id, userId, {
                  errorCode: result.errorCode,
                  error: result.message,
                  durationMs: result.durationMs,
                })

                const payload: FailedJobEvent = {
                  jobId: job.id,
                  modelId: adapter.definition.id,
                  errorCode: result.errorCode,
                  message: getClientSafeErrorMessage(result.errorCode),
                  durationMs: result.durationMs,
                }
                send('job_failed', payload)
                return
              }

              const upload = await uploadImage(
                userId,
                result.data,
                result.mimeType
              )
              const image = await insertGeneratedImageResult({
                userId,
                canvasId: parsed.canvasId,
                groupId,
                model: adapter.definition.id,
                provider: adapter.definition.provider,
                prompt: parsed.prompt,
                aspectRatio: parsed.aspectRatio,
                blobUrl: upload.url,
                sizeBytes: upload.size,
                durationMs: result.durationMs,
              })

              await markGenerationJobCompleted(
                job.id,
                userId,
                image.id,
                result.durationMs
              )

              successCount++
              send('job_completed', {
                jobId: job.id,
                modelId: adapter.definition.id,
                provider: adapter.definition.provider,
                imageId: image.id,
                blobUrl: image.blobUrl,
                durationMs: result.durationMs,
              })
            } catch (error: unknown) {
              const durationMs = Date.now() - jobStartedAt
              const message =
                error instanceof Error ? error.message : 'Generation job failed'

              await markGenerationJobFailed(job.id, userId, {
                errorCode: 'provider_error',
                error: message,
                durationMs,
              }).catch(() => {})

              send('job_failed', {
                jobId: job.id,
                modelId: job.modelId,
                errorCode: 'provider_error',
                message: getClientSafeErrorMessage('provider_error'),
                durationMs,
              } satisfies FailedJobEvent)
            }
          })
        )

        if (successCount === 0 && preDeductedIds.length > 0) {
          await rollbackQuotaDeduction(preDeductedIds).catch((err) => {
            console.error('[generate] rollback after 0 successes failed', err)
          })
        }

        send('done', { groupId })
        closeStreamOnce(controller)
      } catch (error: unknown) {
        // Log full error server-side, send only safe message to client
        console.error('[generate] fatal pipeline error:', error)
        // Rollback pre-deducted quota on total pipeline failure
        await rollbackQuotaDeduction(preDeductedIds).catch(() => {})
        send('fatal', {
          message: 'Generation pipeline failed unexpectedly',
        })
        closeStreamOnce(controller)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Required for nginx-fronted deployments (Tencent Cloud migration)
      'X-Accel-Buffering': 'no',
    },
  })
}
