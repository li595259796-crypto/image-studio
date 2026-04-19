import { randomUUID } from 'node:crypto'
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
} from '@/lib/db/generation-queries'
import { getQuotaInfo } from '@/lib/db/queries'
import { listUserApiKeysForUser } from '@/lib/db/user-api-keys-queries'
import { getByokMasterKeyFromEnv } from '@/lib/crypto/byok'
import { getModelAdaptersForIds, runModelGeneration } from '@/lib/models/router'
import { uploadImage } from '@/lib/storage'
import type { ByokProvider } from '@/lib/byok/providers'
import type { EditInputValid } from './edit-validation'

export {
  isAllowedImageUrl,
  validateEditInput,
  type EditInputRaw,
  type EditInputValid,
  type EditValidationResult,
} from './edit-validation'

export type EditResult = {
  modelId: string
  provider: string
  imageId?: string
  blobUrl?: string
  errorCode?: string
  message?: string
  durationMs?: number
}

export type EditExecutionSuccess = {
  ok: true
  groupId: string
  results: EditResult[]
}

export type EditExecutionFailure = {
  ok: false
  status: number
  error: string
}

export async function executeEditImage(args: {
  userId: string
  input: EditInputValid
}): Promise<EditExecutionSuccess | EditExecutionFailure> {
  const { userId, input } = args
  const { prompt, referenceImageUrls, modelIds } = input

  const groupId = randomUUID()
  const adapters = getModelAdaptersForIds(modelIds)
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
      console.error('[edit-lib] failed to resolve BYOK keys', error)
      return { ok: false, status: 500, error: 'BYOK key decryption unavailable' }
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
      return { ok: false, status: 403, error: 'Quota exceeded' }
    }
  }

  await preDeductQuota({
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

  const results: EditResult[] = []
  for (const runContext of runContexts) {
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

  return { ok: true, groupId, results }
}
