import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import { generateImage, ImageApiError } from './image-api.ts'

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

test('classifies aborted upstream requests as timeout errors', async () => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.IMAGE_API_KEY
  const originalTimeout = process.env.IMAGE_API_TIMEOUT_MS

  process.env.IMAGE_API_KEY = 'test-key'
  process.env.IMAGE_API_TIMEOUT_MS = '5'

  globalThis.fetch = ((_: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      const signal = init?.signal
      signal?.addEventListener(
        'abort',
        () => {
          const error = new Error('aborted')
          Object.assign(error, { name: 'AbortError' })
          reject(error)
        },
        { once: true }
      )
    })) as typeof fetch

  try {
    await assert.rejects(
      () => generateImage('test prompt', '1:1', '1K'),
      (error: unknown) => {
        assert.ok(error instanceof ImageApiError)
        assert.equal(error.kind, 'timeout')
        return true
      }
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv('IMAGE_API_KEY', originalKey)
    restoreEnv('IMAGE_API_TIMEOUT_MS', originalTimeout)
  }
})

test('classifies non-2xx upstream responses with status information', async () => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.IMAGE_API_KEY

  process.env.IMAGE_API_KEY = 'test-key'

  globalThis.fetch = (async () => new Response('Service unavailable', { status: 503 })) as typeof fetch

  try {
    await assert.rejects(
      () => generateImage('test prompt', '1:1', '1K'),
      (error: unknown) => {
        assert.ok(error instanceof ImageApiError)
        assert.equal(error.kind, 'upstream_http')
        assert.equal(error.status, 503)
        return true
      }
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv('IMAGE_API_KEY', originalKey)
  }
})

test('classifies malformed successful responses as invalid-response errors', async () => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.IMAGE_API_KEY

  process.env.IMAGE_API_KEY = 'test-key'

  globalThis.fetch = (async () =>
    Response.json({
      choices: [{ message: { content: 'no base64 image here' } }],
    })) as typeof fetch

  try {
    await assert.rejects(
      () => generateImage('test prompt', '1:1', '1K'),
      (error: unknown) => {
        assert.ok(error instanceof ImageApiError)
        assert.equal(error.kind, 'invalid_response')
        return true
      }
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv('IMAGE_API_KEY', originalKey)
  }
})
