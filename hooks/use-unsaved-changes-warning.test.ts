import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldWarnOnUnload } from './use-unsaved-changes-warning'

test('shouldWarnOnUnload true when has files and not submitted', () => {
  assert.equal(shouldWarnOnUnload({ hasFiles: true, wasSubmitted: false }), true)
})

test('shouldWarnOnUnload false when no files', () => {
  assert.equal(shouldWarnOnUnload({ hasFiles: false, wasSubmitted: false }), false)
})

test('shouldWarnOnUnload false after successful submission', () => {
  assert.equal(shouldWarnOnUnload({ hasFiles: true, wasSubmitted: true }), false)
})
