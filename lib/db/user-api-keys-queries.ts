import { sql } from 'drizzle-orm'
import type { ByokProvider } from '../byok/providers.ts'

export type UserApiKeyProvider = ByokProvider

export interface UserApiKeyRecord {
  id: string
  userId: string
  provider: UserApiKeyProvider
  encryptedKey: string
  keyVersion: number
  createdAt: Date
  updatedAt: Date
}

async function getDb() {
  const dbModule = await import('./index.ts')
  return dbModule.db
}

type UserApiKeyRow = {
  id: unknown
  userId: unknown
  provider: unknown
  encryptedKey: unknown
  keyVersion: unknown
  createdAt: unknown
  updatedAt: unknown
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value
  }

  return new Date(String(value))
}

export function mapUserApiKeyRow(row: UserApiKeyRow): UserApiKeyRecord {
  return {
    id: String(row.id),
    userId: String(row.userId),
    provider: row.provider as UserApiKeyProvider,
    encryptedKey: String(row.encryptedKey),
    keyVersion: Number(row.keyVersion),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  }
}

export async function listUserApiKeysForUser(
  userId: string
): Promise<UserApiKeyRecord[]> {
  const db = await getDb()
  const result = await db.execute(sql`
    SELECT id, "userId", provider, "encryptedKey", "keyVersion", "createdAt", "updatedAt"
    FROM "userApiKeys"
    WHERE "userId" = ${userId}
    ORDER BY provider ASC
  `)

  return result.rows.map((row) => mapUserApiKeyRow(row as UserApiKeyRow))
}

export async function getUserApiKeyForUser(
  userId: string,
  provider: UserApiKeyProvider
): Promise<UserApiKeyRecord | null> {
  const db = await getDb()
  const result = await db.execute(sql`
    SELECT id, "userId", provider, "encryptedKey", "keyVersion", "createdAt", "updatedAt"
    FROM "userApiKeys"
    WHERE "userId" = ${userId} AND provider = ${provider}
    LIMIT 1
  `)

  const row = result.rows[0]
  return row ? mapUserApiKeyRow(row as UserApiKeyRow) : null
}

export async function upsertUserApiKeyForUser(input: {
  userId: string
  provider: UserApiKeyProvider
  encryptedKey: string
  keyVersion: number
}): Promise<UserApiKeyRecord> {
  const db = await getDb()
  const result = await db.execute(sql`
    INSERT INTO "userApiKeys" ("userId", provider, "encryptedKey", "keyVersion")
    VALUES (${input.userId}, ${input.provider}, ${input.encryptedKey}, ${input.keyVersion})
    ON CONFLICT ("userId", provider)
    DO UPDATE SET
      "encryptedKey" = EXCLUDED."encryptedKey",
      "keyVersion" = EXCLUDED."keyVersion",
      "updatedAt" = now()
    RETURNING id, "userId", provider, "encryptedKey", "keyVersion", "createdAt", "updatedAt"
  `)

  return mapUserApiKeyRow(result.rows[0] as UserApiKeyRow)
}

export async function deleteUserApiKeyForUser(
  userId: string,
  provider: UserApiKeyProvider
): Promise<UserApiKeyRecord | null> {
  const db = await getDb()
  const result = await db.execute(sql`
    DELETE FROM "userApiKeys"
    WHERE "userId" = ${userId} AND provider = ${provider}
    RETURNING id, "userId", provider, "encryptedKey", "keyVersion", "createdAt", "updatedAt"
  `)

  const row = result.rows[0]
  return row ? mapUserApiKeyRow(row as UserApiKeyRow) : null
}
