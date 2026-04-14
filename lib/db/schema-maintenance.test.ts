import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('P6C cleanup migration backfills legacy dailyQuota rows and drops the redundant userApiKeys index', () => {
  const migrationUrl = new URL(
    '../../supabase/migrations/002_p6c_cleanup.sql',
    import.meta.url
  )

  assert.equal(existsSync(migrationUrl), true)

  const migration = readFileSync(migrationUrl, 'utf8')

  assert.match(
    migration,
    /UPDATE\s+"users"\s+SET\s+"dailyQuota"\s*=\s*20\s+WHERE\s+"dailyQuota"\s*<\s*20;/i
  )
  assert.match(migration, /DROP INDEX IF EXISTS\s+"user_api_keys_user_idx";/i)
})

test('userApiKeys schema does not keep a redundant user-only index', () => {
  const schema = readFileSync(new URL('./schema.ts', import.meta.url), 'utf8')

  assert.doesNotMatch(schema, /index\('user_api_keys_user_idx'\)/)
})
