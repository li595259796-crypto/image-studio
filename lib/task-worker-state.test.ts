import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldCleanupTempSources } from './task-worker-state.ts'

test('does not clean edit temp sources for retryable failures', () => {
  assert.equal(shouldCleanupTempSources('edit', 'retryable'), false)
})

test('cleans edit temp sources only after terminal outcomes', () => {
  assert.equal(shouldCleanupTempSources('edit', 'completed'), true)
  assert.equal(shouldCleanupTempSources('edit', 'failed'), true)
})

test('does not clean temp sources for generate tasks', () => {
  assert.equal(shouldCleanupTempSources('generate', 'completed'), false)
  assert.equal(shouldCleanupTempSources('generate', 'failed'), false)
})
