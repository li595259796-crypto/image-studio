import test from 'node:test'
import assert from 'node:assert/strict'

import { runModelGeneration } from './router.ts'
import type { ModelAdapter } from './types.ts'

const baseAdapter: ModelAdapter = {
  definition: {
    id: 'gemini-3.1-flash',
    label: 'Gemini 3.1 Flash',
    provider: 'google',
    supportsReferenceImages: false,
  },
  async generate() {
    return {
      ok: true,
      data: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png' as const,
      durationMs: 12,
    }
  },
}

test('returns an ok result without changing successful adapter output', async () => {
  const result = await runModelGeneration({
    adapter: baseAdapter,
    options: { prompt: 'cat', aspectRatio: '1:1' },
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.durationMs, 12)
    assert.deepEqual(Array.from(result.data), [1, 2, 3])
  }
})

test('maps thrown adapter errors into a provider_error result', async () => {
  const result = await runModelGeneration({
    adapter: {
      ...baseAdapter,
      async generate() {
        throw new Error('boom')
      },
    },
    options: { prompt: 'cat', aspectRatio: '1:1' },
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.errorCode, 'provider_error')
    assert.match(result.message, /boom/)
  }
})
