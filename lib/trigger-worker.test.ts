import test from 'node:test'
import assert from 'node:assert/strict'

import { triggerWorker } from './trigger-worker.ts'

test('logs non-2xx worker trigger responses', async () => {
  const originalFetch = globalThis.fetch
  const originalError = console.error
  const originalAppUrl = process.env.APP_URL
  const originalSecret = process.env.WORKER_SECRET
  const errors: unknown[][] = []

  process.env.APP_URL = 'http://localhost:3000'
  process.env.WORKER_SECRET = 'secret'
  globalThis.fetch = async () => new Response('Unauthorized', { status: 401 })
  console.error = (...args: unknown[]) => {
    errors.push(args)
  }

  try {
    await triggerWorker()
  } finally {
    globalThis.fetch = originalFetch
    console.error = originalError
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL
    } else {
      process.env.APP_URL = originalAppUrl
    }
    if (originalSecret === undefined) {
      delete process.env.WORKER_SECRET
    } else {
      process.env.WORKER_SECRET = originalSecret
    }
  }

  assert.equal(errors.length, 1)
  assert.match(String(errors[0][0]), /Failed to kick worker/)
  assert.match(String(errors[0][1]), /401/)
})
