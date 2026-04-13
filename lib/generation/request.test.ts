import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import { parseGenerateRequest } from './request.ts'

test('dedupes model ids while preserving order', () => {
  const parsed = parseGenerateRequest({
    prompt: 'Poster concept',
    aspectRatio: '16:9',
    canvasId: 'canvas-123',
    modelIds: ['gemini-2.5-flash', 'gemini-2.5-flash', 'seedream-5.0'],
  })

  assert.deepEqual(parsed.modelIds, ['gemini-2.5-flash', 'seedream-5.0'])
})

test('rejects unknown model ids before the route touches adapters', () => {
  assert.throws(
    () =>
      parseGenerateRequest({
        prompt: 'Poster concept',
        aspectRatio: '16:9',
        canvasId: 'canvas-123',
        modelIds: ['evil-http-proxy'],
      }),
    /Unsupported model id/
  )
})
