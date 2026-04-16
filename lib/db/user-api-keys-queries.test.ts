import test from 'node:test'
import assert from 'node:assert/strict'

import { mapUserApiKeyRow } from './user-api-keys-queries.ts'

test('maps a raw SQL row into a typed user API key record', () => {
  const record = mapUserApiKeyRow({
    id: 'key-1',
    userId: 'user-1',
    provider: 'google',
    encryptedKey: 'v1:abc:def:ghi',
    keyVersion: 1,
    createdAt: '2026-04-13T12:00:00.000Z',
    updatedAt: '2026-04-13T13:00:00.000Z',
  })

  assert.equal(record.provider, 'google')
  assert.equal(record.keyVersion, 1)
  assert.equal(record.createdAt instanceof Date, true)
  assert.equal(record.updatedAt instanceof Date, true)
})
