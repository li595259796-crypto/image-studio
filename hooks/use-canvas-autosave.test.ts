import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * We test the decision logic of the transition gate, not the full React hook
 * (which would require a React test rig we don't have). Extract the logic.
 */
import { shouldFlipToSaving } from './use-canvas-autosave-gate'

test('shouldFlipToSaving returns true when not in-flight', () => {
  assert.equal(shouldFlipToSaving(false), true)
})

test('shouldFlipToSaving returns false when already in-flight', () => {
  assert.equal(shouldFlipToSaving(true), false)
})
