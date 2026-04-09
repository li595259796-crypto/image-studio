import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { AdapterAccountType } from 'next-auth/adapters'

// ============================================================
// users (NextAuth compatible + password field)
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
  role: text('role').default('user').notNull(),
  dailyQuota: integer('dailyQuota').default(10).notNull(),
  monthlyQuota: integer('monthlyQuota').default(200).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
})

// ============================================================
// accounts (NextAuth required — OAuth providers)
// ============================================================
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
)

// ============================================================
// sessions (NextAuth required)
// ============================================================
export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// ============================================================
// images
// ============================================================
export const images = pgTable('images', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<'generate' | 'edit'>().notNull(),
  prompt: text('prompt').notNull(),
  aspectRatio: text('aspectRatio'),
  quality: text('quality'),
  blobUrl: text('blobUrl').notNull(),
  sizeBytes: integer('sizeBytes'),
  sourceImages: text('sourceImages'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
})

// ============================================================
// usageLogs
// ============================================================
export const usageLogs = pgTable('usageLogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').$type<'generate' | 'edit'>().notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
})

// ============================================================
// Relations
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  images: many(images),
  usageLogs: many(usageLogs),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const imagesRelations = relations(images, ({ one }) => ({
  user: one(users, {
    fields: [images.userId],
    references: [users.id],
  }),
}))

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, {
    fields: [usageLogs.userId],
    references: [users.id],
  }),
}))
