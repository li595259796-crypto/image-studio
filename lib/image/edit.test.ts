import test from 'node:test'
import assert from 'node:assert/strict'

// We test the post-loop rollback decision logic separately from the full
// executeEditImage (which has heavy @/lib/db transitive imports).
// Approach: extract a tiny decision helper we can unit-test.

import { shouldRollbackAfterLoop } from './edit-rollback'

test('shouldRollbackAfterLoop returns true when all results failed', () => {
  const results = [
    { modelId: 'm1', provider: 'p', errorCode: 'timeout', message: 'x' },
    { modelId: 'm2', provider: 'p', errorCode: 'provider_error', message: 'y' },
  ]
  assert.equal(shouldRollbackAfterLoop(results), true)
})

test('shouldRollbackAfterLoop returns false when at least one succeeded', () => {
  const results = [
    { modelId: 'm1', provider: 'p', errorCode: 'timeout', message: 'x' },
    { modelId: 'm2', provider: 'p', imageId: 'img1', blobUrl: 'u' },
  ]
  assert.equal(shouldRollbackAfterLoop(results), false)
})

test('shouldRollbackAfterLoop returns true on empty results (defensive)', () => {
  assert.equal(shouldRollbackAfterLoop([]), true)
})
