import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CANVAS_STATE_MAX_BYTES,
  DEFAULT_CANVAS_NAME,
  assertCanvasStateWithinLimit,
  createEmptyCanvasState,
  pickPersistedAppState,
  sanitizeCanvasName,
} from './state.ts'

test('creates a minimal empty canvas snapshot', () => {
  const snapshot = createEmptyCanvasState()

  assert.deepEqual(snapshot.elements, [])
  assert.equal(typeof snapshot.appState, 'object')
  assert.equal(typeof snapshot.files, 'object')
})

test('sanitizes blank names back to the default canvas name', () => {
  assert.equal(sanitizeCanvasName('   '), DEFAULT_CANVAS_NAME)
  assert.equal(sanitizeCanvasName(' Product Board '), 'Product Board')
})

test('serializes repeated snapshots consistently for dirty tracking', () => {
  const base = createEmptyCanvasState()
  const first = assertCanvasStateWithinLimit(base)
  const second = assertCanvasStateWithinLimit(structuredClone(base))

  assert.equal(first, second)
})

test('rejects oversized serialized canvas snapshots', () => {
  const oversized = {
    elements: [],
    appState: {},
    files: {},
    notes: 'x'.repeat(CANVAS_STATE_MAX_BYTES + 1),
  }

  assert.throws(() => assertCanvasStateWithinLimit(oversized), /Canvas state exceeds/)
})

test('keeps only the serializable appState fields we want to persist', () => {
  const persisted = pickPersistedAppState({
    viewBackgroundColor: '#ffffff',
    gridSize: null,
    scrollX: 120,
    scrollY: -48,
    zoom: { value: 1.25 },
    zenModeEnabled: true,
    collaborators: new Map([['demo', { username: 'skip-me' }]]),
    openMenu: 'canvas',
  })

  assert.deepEqual(persisted, {
    viewBackgroundColor: '#ffffff',
    gridSize: null,
    zenModeEnabled: true,
    scrollX: 120,
    scrollY: -48,
    zoom: { value: 1.25 },
  })
})
