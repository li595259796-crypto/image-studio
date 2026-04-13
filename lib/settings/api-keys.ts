import type { ByokProvider } from '../byok/providers.ts'
import { decryptApiKey, maskApiKey } from '../crypto/byok.ts'
import type { UserApiKeyRecord } from '../db/user-api-keys-queries.ts'

export interface UserApiKeyView {
  provider: ByokProvider
  configured: boolean
  maskedKey: string | null
  keyVersion: number | null
  updatedAt: string | null
}

export type UserApiKeyViews = Record<ByokProvider, UserApiKeyView>

export function createEmptyUserApiKeyViews(): UserApiKeyViews {
  return {
    google: {
      provider: 'google',
      configured: false,
      maskedKey: null,
      keyVersion: null,
      updatedAt: null,
    },
    bytedance: {
      provider: 'bytedance',
      configured: false,
      maskedKey: null,
      keyVersion: null,
      updatedAt: null,
    },
    alibaba: {
      provider: 'alibaba',
      configured: false,
      maskedKey: null,
      keyVersion: null,
      updatedAt: null,
    },
  }
}

export function createUserApiKeyViews(input: {
  userId: string
  encryptedRecords: UserApiKeyRecord[]
  masterKeyHex: string
}): UserApiKeyViews {
  const providers = createEmptyUserApiKeyViews()

  for (const record of input.encryptedRecords) {
    providers[record.provider] = {
      provider: record.provider,
      configured: true,
      maskedKey: maskApiKey(
        decryptApiKey({
          encryptedKey: record.encryptedKey,
          userId: input.userId,
          masterKeyHex: input.masterKeyHex,
          keyVersion: record.keyVersion,
        })
      ),
      keyVersion: record.keyVersion,
      updatedAt: record.updatedAt.toISOString(),
    }
  }

  return providers
}

export function isValidApiKeyInput(value: string): boolean {
  return value.trim().length >= 8 && value.trim().length <= 4096
}
