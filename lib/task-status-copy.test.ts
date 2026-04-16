import test from 'node:test'
import assert from 'node:assert/strict'

import { getTaskStatusMessage } from './task-status-copy.ts'

test('uses queue copy for pending tasks', () => {
  assert.equal(getTaskStatusMessage('pending', 12, 'zh'), '排队中... 12s')
  assert.equal(getTaskStatusMessage('pending', 12, 'en'), 'Queued... 12s')
})

test('uses generation copy for processing tasks', () => {
  assert.equal(getTaskStatusMessage('processing', 18, 'zh'), '生成中... 18s')
  assert.equal(getTaskStatusMessage('processing', 18, 'en'), 'Generating... 18s')
})
