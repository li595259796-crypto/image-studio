import assert from 'node:assert/strict'
import test from 'node:test'

import { encryptApiKey } from '../crypto/byok.ts'
import {
  countPlatformRunContexts,
  decryptUserApiKeyRecords,
  resolveModelRunContexts,
} from './runtime.ts'
import type { ModelAdapter } from '../models/types.ts'

const MASTER_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

function createAdapter(
  id: 'gemini-3.1-flash' | 'seedream-5.0' | 'tongyi-wanx2.1',
  provider: 'google' | 'bytedance' | 'alibaba'
): ModelAdapter {
  return {
    definition: {
      id,
      label: id,
      provider,
      supportsReferenceImages: false,
    },
    async generate() {
      throw new Error('not used in unit tests')
    },
  }
}

test('decryptUserApiKeyRecords returns provider keyed plaintext values', () => {
  const encrypted = encryptApiKey({
    plaintext: 'AIza-user-secret',
    userId: 'user-1',
    masterKeyHex: MASTER_KEY,
  })

  const providerKeys = decryptUserApiKeyRecords({
    records: [
      {
        id: 'key-1',
        userId: 'user-1',
        provider: 'google',
        encryptedKey: encrypted.encryptedKey,
        keyVersion: encrypted.keyVersion,
        createdAt: new Date('2026-04-13T12:00:00.000Z'),
        updatedAt: new Date('2026-04-13T12:05:00.000Z'),
      },
    ],
    userId: 'user-1',
    masterKeyHex: MASTER_KEY,
  })

  assert.equal(providerKeys.google, 'AIza-user-secret')
})

test('resolveModelRunContexts marks providers with stored keys as byok', () => {
  const adapters = [
    createAdapter('gemini-3.1-flash', 'google'),
    createAdapter('seedream-5.0', 'bytedance'),
    createAdapter('tongyi-wanx2.1', 'alibaba'),
  ]

  const contexts = resolveModelRunContexts(adapters, {
    google: 'AIza-user-secret',
    alibaba: 'dashscope-user-secret',
  })

  assert.deepEqual(
    contexts.map((context) => ({
      provider: context.adapter.definition.provider,
      quotaSource: context.quotaSource,
      hasApiKey: typeof context.apiKey === 'string',
    })),
    [
      { provider: 'google', quotaSource: 'byok', hasApiKey: true },
      { provider: 'bytedance', quotaSource: 'platform', hasApiKey: false },
      { provider: 'alibaba', quotaSource: 'byok', hasApiKey: true },
    ]
  )
  assert.equal(countPlatformRunContexts(contexts), 1)
})
