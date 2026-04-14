import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('getQuotaInfo uses the stored dailyQuota instead of a runtime floor', () => {
  const source = readFileSync(new URL('./queries.ts', import.meta.url), 'utf8')

  assert.match(source, /const dailyLimit = user\.dailyQuota/)
  assert.doesNotMatch(source, /Math\.max\(user\.dailyQuota,\s*20\)/)
})
