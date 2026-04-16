import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import {
  countPlatformRunContexts,
  decryptUserApiKeyRecords,
  resolveModelRunContexts,
} from '@/lib/byok/runtime'
import {
  insertGeneratedImageResult,
  markGenerationJobCompleted,
  markGenerationJobFailed,
  preDeductQuota,
  rollbackQuotaDeduction,
} from '@/lib/db/generation-queries'
import { getQuotaInfo } from '@/lib/db/queries'
import { listUserApiKeysForUser } from '@/lib/db/user-api-keys-queries'
import { getByokMasterKeyFromEnv } from '@/lib/crypto/byok'
import { getModelAdaptersForIds, runModelGeneration } from '@/lib/models/router'
import { uploadImage } from '@/lib/storage'
import type { ModelId } from '@/lib/models/types'
import type { ByokProvider } from '@/lib/byok/providers'

export const maxDuration = 300
export const runtime = 'nodejs'

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

// SSRF guard: only allow Vercel Blob storage URLs
function isAllowedImageUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.blob.vercel-storage.com')
    )
  } catch {
    return false
  }
}

export async function POST(request: Request): Promise<Response> {
  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  // For internal calls from editImageAction, userId comes in the body
  let userId: string | null = (raw.userId as string) || null
  if (!userId) {
    const session = await auth()
    if (!session?.user?.id) {
      return jsonError('Unauthorized', 401)
    }
    userId = session.user.id
  }

  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : ''
  if (!prompt) {
    return jsonError('Prompt is required', 400)
  }
  if (prompt.length > 2000) {
    return jsonError('Prompt must be 2000 characters or fewer', 400)
  }

  if (!Array.isArray(raw.referenceImages) || raw.referenceImages.length === 0) {
    return jsonError('At least one reference image is required', 400)
  }
  if (raw.referenceImages.length > 2) {
    return jsonError('At most 2 reference images are supported', 400)
  }

  const referenceImageUrls = raw.referenceImages as string[]
  for (const url of referenceImageUrls) {
    if (!isAllowedImageUrl(url)) {
      return jsonError('Invalid reference image URL', 400)
    }
  }

  const modelIds = raw.modelIds
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    return jsonError('At least one model must be specified', 400)
  }

  const groupId = randomUUID()
  const adapters = getModelAdaptersForIds(modelIds as ModelId[])
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
      console.error('[edit] failed to resolve BYOK keys', error)
      return jsonError('BYOK key decryption unavailable', 500)
    }
  }
  const runContexts = resolveModelRunContexts(adapters, providerKeys)

  const platformModelCount = countPlatformRunContexts(runContexts)
  if (platformModelCount > 0) {
    const quota = await getQuotaInfo(userId)
    if (
      quota.dailyUsed + platformModelCount > quota.dailyLimit ||
      quota.monthlyUsed + platformModelCount > quota.monthlyLimit
    ) {
      return jsonError('Quota exceeded', 403)
    }
  }

  const preDeducted = await preDeductQuota({
    userId,
    action: 'edit',
    models: runContexts.map((context) => ({
      modelId: context.adapter.definition.id,
      provider: context.adapter.definition.provider,
      quotaSource: context.quotaSource,
    })),
    groupId,
    canvasId: undefined,
  })
  const preDeductedIds = preDeducted.map((row) => row.id)

  // Run generation for each model adapter
  const results: Array<{
    modelId: string
    provider: string
    imageId?: string
    blobUrl?: string
    errorCode?: string
    message?: string
    durationMs?: number
  }> = []

  for (let i = 0; i < runContexts.length; i++) {
    const runContext = runContexts[i]
    const adapter = runContext.adapter
    const jobId = randomUUID()

    const result = await runModelGeneration({
      adapter,
      options: {
        prompt: `Edit this image according to the following instructions: ${prompt}`,
        aspectRatio: '1:1',
        apiKey: runContext.apiKey,
        referenceImageUrls,
      },
    })

    if (!result.ok) {
      await markGenerationJobFailed(jobId, userId, {
        errorCode: result.errorCode,
        error: result.message,
        durationMs: result.durationMs,
      })
      results.push({
        modelId: adapter.definition.id,
        provider: adapter.definition.provider,
        errorCode: result.errorCode,
        message: result.message,
        durationMs: result.durationMs,
      })
    } else {
      const upload = await uploadImage(userId, result.data, result.mimeType)
      const image = await insertGeneratedImageResult({
        userId,
        canvasId: undefined,
        groupId,
        model: adapter.definition.id,
        provider: adapter.definition.provider,
        prompt,
        aspectRatio: '1:1',
        blobUrl: upload.url,
        sizeBytes: upload.size,
        durationMs: result.durationMs,
      })
      await markGenerationJobCompleted(jobId, userId, image.id, result.durationMs)
      results.push({
        modelId: adapter.definition.id,
        provider: adapter.definition.provider,
        imageId: image.id,
        blobUrl: image.blobUrl,
        durationMs: result.durationMs,
      })
    }
  }

  return Response.json({
    success: true,
    groupId,
    results,
  })
}
