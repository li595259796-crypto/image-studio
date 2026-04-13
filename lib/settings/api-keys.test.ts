import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error direct TS import for node --test in this repo
import { encryptApiKey } from '../crypto/byok.ts'
// @ts-expect-error direct TS import for node --test in this repo
import {
  createEmptyUserApiKeyViews,
  createUserApiKeyViews,
  isValidApiKeyInput,
} from './api-keys.ts'

const MASTER_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

test('createEmptyUserApiKeyViews returns all BYOK providers as unconfigured', () => {
  const views = createEmptyUserApiKeyViews()

  assert.deepEqual(Object.keys(views).sort(), [
    'alibaba',
    'bytedance',
    'google',
  ])
  assert.equal(views.google.configured, false)
  assert.equal(views.google.maskedKey, null)
})

test('createUserApiKeyViews decrypts and masks stored API keys', () => {
  const encrypted = encryptApiKey({
    plaintext: 'AIzaSuperSecretKey',
    userId: 'user-1',
    masterKeyHex: MASTER_KEY,
  })

  const views = createUserApiKeyViews({
    userId: 'user-1',
    masterKeyHex: MASTER_KEY,
    encryptedRecords: [
      {
        id: 'key-1',
        userId: 'user-1',
        provider: 'google',
        encryptedKey: encrypted.encryptedKey,
        keyVersion: encrypted.keyVersion,
        createdAt: new Date('2026-04-13T12:00:00.000Z'),
        updatedAt: new Date('2026-04-13T13:00:00.000Z'),
      },
    ],
  })

  assert.equal(views.google.configured, true)
  assert.equal(views.google.maskedKey, 'AIza**********tKey')
  assert.equal(views.google.updatedAt, '2026-04-13T13:00:00.000Z')
  assert.equal(views.bytedance.configured, false)
})

test('isValidApiKeyInput enforces trimmed length guard rails', () => {
  assert.equal(isValidApiKeyInput('short'), false)
  assert.equal(isValidApiKeyInput('        long-enough-key        '), true)
  assert.equal(isValidApiKeyInput('x'.repeat(4097)), false)
})
