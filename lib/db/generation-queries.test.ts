import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('rollbackQuotaDeduction batches placeholder row cleanup with inArray', () => {
  const source = readFileSync(new URL('./generation-queries.ts', import.meta.url), 'utf8')
  const rollbackFunction = source.match(
    /export async function rollbackQuotaDeduction\(usageLogIds: string\[\]\) \{[\s\S]*?\n\}/
  )

  assert.notEqual(rollbackFunction, null)
  assert.match(rollbackFunction[0], /inArray\(\s*usageLogs\.id,\s*usageLogIds\s*\)/)
  assert.doesNotMatch(rollbackFunction[0], /for\s*\(const id of usageLogIds\)/)
})
