import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import { serializeSseEvent } from './sse.ts'

test('serializes a named SSE event with a JSON payload', () => {
  const event = serializeSseEvent('job_completed', {
    modelId: 'gemini-3.1-flash',
    imageId: 'img-123',
  })

  assert.match(event, /^event: job_completed/m)
  assert.match(
    event,
    /^data: \{"modelId":"gemini-3\.1-flash","imageId":"img-123"\}$/m
  )
  assert.match(event, /\n\n$/)
})
