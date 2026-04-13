import { decryptApiKey } from '../crypto/byok.ts'
import type { UserApiKeyRecord } from '../db/user-api-keys-queries.ts'
import type { ModelAdapter } from '../models/types.ts'
import type { ByokProvider } from './providers.ts'

export interface ResolvedModelRunContext {
  adapter: ModelAdapter
  apiKey?: string
  quotaSource: 'platform' | 'byok'
}

export function decryptUserApiKeyRecords(input: {
  records: UserApiKeyRecord[]
  userId: string
  masterKeyHex: string
}): Partial<Record<ByokProvider, string>> {
  const providerKeys: Partial<Record<ByokProvider, string>> = {}

  for (const record of input.records) {
    providerKeys[record.provider] = decryptApiKey({
      encryptedKey: record.encryptedKey,
      userId: input.userId,
      masterKeyHex: input.masterKeyHex,
      keyVersion: record.keyVersion,
    })
  }

  return providerKeys
}

export function resolveModelRunContexts(
  adapters: ModelAdapter[],
  providerKeys: Partial<Record<ByokProvider, string>>
): ResolvedModelRunContext[] {
  return adapters.map((adapter) => {
    const apiKey = providerKeys[adapter.definition.provider as ByokProvider]

    if (apiKey) {
      return {
        adapter,
        apiKey,
        quotaSource: 'byok',
      }
    }

    return {
      adapter,
      quotaSource: 'platform',
    }
  })
}

export function countPlatformRunContexts(
  contexts: ResolvedModelRunContext[]
): number {
  return contexts.filter((context) => context.quotaSource === 'platform').length
}
