import test from 'node:test'
import assert from 'node:assert/strict'

import { getGallerySinceDate } from './gallery.ts'

test('returns UTC start of day for today range', () => {
  const now = new Date('2026-04-10T15:24:00.000Z')

  assert.equal(
    getGallerySinceDate('today', now).toISOString(),
    '2026-04-10T00:00:00.000Z'
  )
})

test('returns seven-day cutoff for 7d range', () => {
  const now = new Date('2026-04-10T15:24:00.000Z')

  assert.equal(
    getGallerySinceDate('7d', now).toISOString(),
    '2026-04-03T15:24:00.000Z'
  )
})

test('returns thirty-day cutoff for 30d range', () => {
  const now = new Date('2026-04-10T15:24:00.000Z')

  assert.equal(
    getGallerySinceDate('30d', now).toISOString(),
    '2026-03-11T15:24:00.000Z'
  )
})
