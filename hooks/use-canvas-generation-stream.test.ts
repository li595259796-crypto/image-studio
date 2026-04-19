import test from 'node:test'
import assert from 'node:assert/strict'

import { parseSseMessages } from './use-canvas-generation-stream.ts'

test('parseSseMessages returns parsed events and preserves the trailing partial chunk', () => {
  const parsed = parseSseMessages(
    [
      'event: started',
      'data: {"groupId":"g1"}',
      '',
      'event: job_completed',
      'data: {"jobId":"j1"}',
      '',
      'event: fatal',
      'data: {"message":"oops"}',
    ].join('\n')
  )

  assert.equal(parsed.events.length, 2)
  assert.deepEqual(parsed.events[0], {
    event: 'started',
    data: { groupId: 'g1' },
  })
  assert.deepEqual(parsed.events[1], {
    event: 'job_completed',
    data: { jobId: 'j1' },
  })
  assert.match(parsed.remainder, /^event: fatal/)
})

import { classifyStreamEnd } from './use-canvas-generation-stream'

test('classifyStreamEnd returns ok when terminal event was seen', () => {
  assert.equal(classifyStreamEnd(true), 'ok')
})

test('classifyStreamEnd returns early_close when no terminal seen', () => {
  assert.equal(classifyStreamEnd(false), 'early_close')
})
