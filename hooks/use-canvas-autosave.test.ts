import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * We test the decision logic of the transition gate, not the full React hook
 * (which would require a React test rig we don't have). Extract the logic.
 */
import { shouldAutoRetryAfterSave, shouldFlipToSaving } from './use-canvas-autosave-gate'

test('shouldFlipToSaving returns true when not in-flight', () => {
  assert.equal(shouldFlipToSaving(false), true)
})

test('shouldFlipToSaving returns false when already in-flight', () => {
  assert.equal(shouldFlipToSaving(true), false)
})

test('shouldAutoRetryAfterSave never retries on error — prevents runaway loop', () => {
  assert.equal(
    shouldAutoRetryAfterSave({ succeeded: false, dirty: true, hasPendingState: true }),
    false
  )
})

test('shouldAutoRetryAfterSave retries on success when dirty with pending state', () => {
  assert.equal(
    shouldAutoRetryAfterSave({ succeeded: true, dirty: true, hasPendingState: true }),
    true
  )
})

test('shouldAutoRetryAfterSave does not retry on success when clean', () => {
  assert.equal(
    shouldAutoRetryAfterSave({ succeeded: true, dirty: false, hasPendingState: false }),
    false
  )
})
