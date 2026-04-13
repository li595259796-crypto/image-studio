import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import {
  createGeneratedImageElement,
  createGenerationPlaceholderElement,
} from './generation-elements.ts'

test('builds a deterministic placeholder card per model', () => {
  const element = createGenerationPlaceholderElement({
    modelId: 'gemini-2.5-flash',
    index: 1,
    placeholderKey: 'run-1:gemini-2.5-flash',
  })

  assert.equal(element.type, 'rectangle')
  assert.equal(element.width > 0, true)
  assert.deepEqual(element.customData, {
    kind: 'generation-placeholder',
    modelId: 'gemini-2.5-flash',
    placeholderKey: 'run-1:gemini-2.5-flash',
  })
})

test('builds an image element for a completed generation result', () => {
  const element = createGeneratedImageElement({
    fileId: 'file-1',
    x: 320,
    y: 120,
    width: 1024,
    height: 1024,
  })

  assert.equal(element.type, 'image')
  assert.equal(element.fileId, 'file-1')
})
