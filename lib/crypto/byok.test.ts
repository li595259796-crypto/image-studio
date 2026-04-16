import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CURRENT_BYOK_KEY_VERSION,
  decryptApiKey,
  deriveByokKey,
  encryptApiKey,
  maskApiKey,
  parseEncryptedKeyPayload,
} from './byok.ts'

const MASTER_KEY_HEX =
  '4a2d37c611aa90b5ad0fa8204ef12c93e2f7d10f90d5d66e76287408c6e4b27b'

test('encrypts and decrypts an API key with per-user derived material', () => {
  const encrypted = encryptApiKey({
    plaintext: 'AIzaSyDemoSecret1234',
    userId: 'user-1',
    masterKeyHex: MASTER_KEY_HEX,
    keyVersion: CURRENT_BYOK_KEY_VERSION,
  })

  const decrypted = decryptApiKey({
    encryptedKey: encrypted.encryptedKey,
    userId: 'user-1',
    masterKeyHex: MASTER_KEY_HEX,
    keyVersion: encrypted.keyVersion,
  })

  assert.equal(decrypted, 'AIzaSyDemoSecret1234')
})

test('derives distinct keys for different users', () => {
  const a = deriveByokKey({
    userId: 'user-a',
    masterKeyHex: MASTER_KEY_HEX,
    keyVersion: CURRENT_BYOK_KEY_VERSION,
  })
  const b = deriveByokKey({
    userId: 'user-b',
    masterKeyHex: MASTER_KEY_HEX,
    keyVersion: CURRENT_BYOK_KEY_VERSION,
  })

  assert.notDeepEqual(a, b)
})

test('rejects decryption when the user context changes', () => {
  const encrypted = encryptApiKey({
    plaintext: 'sk-demo-1234567890',
    userId: 'user-1',
    masterKeyHex: MASTER_KEY_HEX,
    keyVersion: CURRENT_BYOK_KEY_VERSION,
  })

  assert.throws(
    () =>
      decryptApiKey({
        encryptedKey: encrypted.encryptedKey,
        userId: 'user-2',
        masterKeyHex: MASTER_KEY_HEX,
        keyVersion: encrypted.keyVersion,
      }),
    /decrypt/i
  )
})

test('formats encrypted payload as a versioned single column value', () => {
  const encrypted = encryptApiKey({
    plaintext: 'AIzaSyDemoSecret1234',
    userId: 'user-1',
    masterKeyHex: MASTER_KEY_HEX,
    keyVersion: CURRENT_BYOK_KEY_VERSION,
  })

  assert.match(encrypted.encryptedKey, /^v1:/)

  const parsed = parseEncryptedKeyPayload(encrypted.encryptedKey)
  assert.equal(parsed.version, 1)
  assert.equal(typeof parsed.iv, 'string')
  assert.equal(typeof parsed.authTag, 'string')
})

test('masks an API key while keeping a short suffix visible', () => {
  assert.equal(maskApiKey('AIzaSyDemoSecret1234'), 'AIza************1234')
  assert.equal(maskApiKey('abcd'), '****')
  assert.equal(maskApiKey(''), '')
})
