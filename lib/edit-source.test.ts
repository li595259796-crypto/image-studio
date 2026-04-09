import test from 'node:test'
import assert from 'node:assert/strict'

import { getPreloadableSourceUrl } from './edit-source.ts'

test('returns https source url when there are no uploaded files', () => {
  assert.equal(
    getPreloadableSourceUrl('https://example.com/source.png', 0),
    'https://example.com/source.png'
  )
})

test('returns null when source url is missing', () => {
  assert.equal(getPreloadableSourceUrl(null, 0), null)
})

test('returns null when files already exist', () => {
  assert.equal(getPreloadableSourceUrl('https://example.com/source.png', 1), null)
})

test('returns null for non-https source urls', () => {
  assert.equal(getPreloadableSourceUrl('http://example.com/source.png', 0), null)
})
