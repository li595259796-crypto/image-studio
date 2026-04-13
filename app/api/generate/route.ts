import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
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
import { getQuotaInfo } from '@/lib/db/queries'
import { parseGenerateRequest } from '@/lib/generation/request'
import { serializeSseEvent } from '@/lib/generation/sse'
import { getModelAdaptersForIds, runModelGeneration } from '@/lib/models/router'
import { uploadImage } from '@/lib/storage'

export const maxDuration = 300
export const runtime = 'nodejs'

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

  let parsed: ReturnType<typeof parseGenerateRequest>
  try {
    const raw = (await request.json()) as Record<string, unknown>
    parsed = parseGenerateRequest(raw)
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : 'Invalid generate request',
      400
    )
  }

  const canvas = await getCanvasByIdAndUser(userId, parsed.canvasId)
  if (!canvas) {
    return jsonError('Canvas not found', 404)
  }

  const perMinuteCount = await listRecentGenerationCountForUser(userId)
  if (perMinuteCount + parsed.modelIds.length > 60) {
    return jsonError('Rate limit exceeded', 429)
  }

  const quota = await getQuotaInfo(userId)
  if (
    quota.dailyUsed + parsed.modelIds.length > quota.dailyLimit ||
    quota.monthlyUsed + parsed.modelIds.length > quota.monthlyLimit
  ) {
    return jsonError('Quota exceeded', 403)
  }

  const groupId = randomUUID()
  const adapters = getModelAdaptersForIds(parsed.modelIds)

  // Atomic quota pre-deduction: insert usageLogs rows BEFORE generation starts.
  // This prevents TOCTOU races where concurrent requests both pass the quota check.
  const preDeducted = await preDeductQuota({
    userId,
    action: 'generate',
    models: adapters.map((a) => ({
      modelId: a.definition.id,
      provider: a.definition.provider,
    })),
    quotaSource: 'platform',
    groupId,
    canvasId: parsed.canvasId,
  })
  const preDeductedIds = preDeducted.map((r) => r.id)

  const jobs = await createGenerationJobs({
    groupId,
    userId,
    canvasId: parsed.canvasId,
    prompt: parsed.prompt,
    aspectRatio: parsed.aspectRatio,
    quotaSource: 'platform',
    models: adapters.map((adapter) => ({
      modelId: adapter.definition.id,
      provider: adapter.definition.provider,
    })),
  })

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
        await Promise.allSettled(
          jobs.map(async (job, index) => {
            const adapter = adapters[index]
            if (!adapter) {
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
                // Sanitize: only send error code to client, not raw provider message
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
            // Quota already pre-deducted via preDeductQuota before stream opened

            send('job_completed', {
              jobId: job.id,
              modelId: adapter.definition.id,
              provider: adapter.definition.provider,
              imageId: image.id,
              blobUrl: image.blobUrl,
              durationMs: result.durationMs,
            })
          })
        )

        send('done', { groupId })
        controller.close()
      } catch (error: unknown) {
        // Log full error server-side, send only safe message to client
        console.error('[generate] fatal pipeline error:', error)
        // Rollback pre-deducted quota on total pipeline failure
        await rollbackQuotaDeduction(preDeductedIds).catch(() => {})
        send('fatal', {
          message: 'Generation pipeline failed unexpectedly',
        })
        controller.close()
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
