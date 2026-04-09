import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
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

test('returns null for invalid urls', () => {
  assert.equal(getPreloadableSourceUrl('not-a-url', 0), null)
  assert.equal(getPreloadableSourceUrl('https://', 0), null)
  assert.equal(getPreloadableSourceUrl('://missing-protocol.com', 0), null)
})
