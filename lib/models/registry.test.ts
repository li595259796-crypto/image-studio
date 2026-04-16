import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ALLOWED_MODEL_IDS,
  getModelDefinition,
  supportsReferenceImages,
} from './constants.ts'

test('only allows the P6B image model ids', () => {
  assert.deepEqual(ALLOWED_MODEL_IDS, [
    'gemini-3.1-flash',
    'seedream-5.0',
    'tongyi-wanx2.1',
  ])
})

test('returns metadata for a known model id', () => {
  const model = getModelDefinition('gemini-3.1-flash')

  assert.equal(model.provider, 'google')
  assert.equal(model.label, 'Gemini 3.1 Flash')
})

test('reports reference-image support from the model registry', () => {
  assert.equal(supportsReferenceImages('gemini-3.1-flash'), false)
  assert.equal(supportsReferenceImages('seedream-5.0'), true)
})
