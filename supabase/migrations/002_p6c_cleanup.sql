BEGIN;

-- Backfill legacy free-tier rows so runtime quota checks can trust stored values.
UPDATE "users"
SET "dailyQuota" = 20
WHERE "dailyQuota" < 20;

-- The composite unique index already covers lookups by userId prefix.
DROP INDEX IF EXISTS "user_api_keys_user_idx";

COMMIT;
