// TEMP-DIAGNOSIS: delete at teardown together with debug-diagnosis.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import {
  validateDebugAuth,
  parseSleepSeconds,
  validateBlobUrl,
} from './debug-diagnosis.ts'

test('validateDebugAuth returns 503 when secret env var is missing', () => {
  assert.deepEqual(
    validateDebugAuth('Bearer anything', undefined),
    { ok: false, status: 503 }
  )
  assert.deepEqual(
    validateDebugAuth('Bearer anything', ''),
    { ok: false, status: 503 }
  )
})

test('validateDebugAuth returns 401 when header does not match', () => {
  assert.deepEqual(
    validateDebugAuth(null, 'the-secret'),
    { ok: false, status: 401 }
  )
  assert.deepEqual(
    validateDebugAuth('Bearer wrong', 'the-secret'),
    { ok: false, status: 401 }
  )
  assert.deepEqual(
    validateDebugAuth('the-secret', 'the-secret'),
    { ok: false, status: 401 }
  )
})

test('validateDebugAuth returns ok on exact bearer match', () => {
  assert.deepEqual(
    validateDebugAuth('Bearer the-secret', 'the-secret'),
    { ok: true }
  )
})

test('parseSleepSeconds defaults to 75 when param is missing', () => {
  assert.equal(parseSleepSeconds(null), 75)
})

test('parseSleepSeconds clamps to [1, 180]', () => {
  assert.equal(parseSleepSeconds('0'), 1)
  assert.equal(parseSleepSeconds('-5'), 1)
  assert.equal(parseSleepSeconds('200'), 180)
  assert.equal(parseSleepSeconds('180'), 180)
  assert.equal(parseSleepSeconds('1'), 1)
  assert.equal(parseSleepSeconds('75'), 75)
})

test('parseSleepSeconds falls back to 1 on non-numeric input', () => {
  assert.equal(parseSleepSeconds('hello'), 1)
  assert.equal(parseSleepSeconds(''), 1)
})

test('validateBlobUrl accepts https vercel blob URLs', () => {
  assert.equal(
    validateBlobUrl('https://abc123.public.blob.vercel-storage.com/fixture.jpg').ok,
    true
  )
})

test('validateBlobUrl rejects non-https', () => {
  assert.equal(
    validateBlobUrl('http://abc123.public.blob.vercel-storage.com/fixture.jpg').ok,
    false
  )
})

test('validateBlobUrl rejects non-vercel-blob hostnames', () => {
  assert.equal(
    validateBlobUrl('https://evil.example.com/fixture.jpg').ok,
    false
  )
  assert.equal(
    validateBlobUrl('https://public.blob.vercel-storage.com.evil.com/a').ok,
    false
  )
})

test('validateBlobUrl rejects unparseable URLs', () => {
  assert.equal(validateBlobUrl('not a url').ok, false)
  assert.equal(validateBlobUrl('').ok, false)
  assert.equal(validateBlobUrl(undefined).ok, false)
})
