import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  primaryKey,
  boolean,
  jsonb,
  index,
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
  emailVerified: timestamp('emailVerified', { withTimezone: true, mode: 'date' }),
  image: text('image'),
  password: text('password'),
  role: text('role').default('user').notNull(),
  dailyQuota: integer('dailyQuota').default(10).notNull(),
  monthlyQuota: integer('monthlyQuota').default(200).notNull(),
  locale: text('locale').default('zh').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
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
  expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
})

// ============================================================
// canvases
// ============================================================
export const canvases = pgTable(
  'canvases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').default('Untitled Canvas').notNull(),
    state: jsonb('state').$type<Record<string, unknown>>().notNull(),
    thumbnailUrl: text('thumbnailUrl'),
    lastOpenedAt: timestamp('lastOpenedAt', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow().notNull(),
    createdAt: timestamp('createdAt', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow().notNull(),
  },
  (table) => [
    index('canvases_user_updated_idx').on(table.userId, table.updatedAt),
    index('canvases_user_last_opened_idx').on(table.userId, table.lastOpenedAt),
  ]
)

// ============================================================
// images
// ============================================================
export const images = pgTable(
  'images',
  {
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
    canvasId: uuid('canvasId').references(() => canvases.id, {
      onDelete: 'set null',
    }),
    isFavorite: boolean('isFavorite').default(false).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('images_user_created_idx').on(table.userId, table.createdAt),
    index('images_canvas_created_idx').on(table.canvasId, table.createdAt),
  ]
)

// ============================================================
// usageLogs
// ============================================================
export const usageLogs = pgTable(
  'usageLogs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').$type<'generate' | 'edit'>().notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('usage_logs_user_created_idx').on(table.userId, table.createdAt)]
)

// ============================================================
// tasks (async job queue)
// ============================================================
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<'generate' | 'edit'>().notNull(),
    status: text('status')
      .$type<'pending' | 'processing' | 'completed' | 'failed'>()
      .default('pending')
      .notNull(),
    payload: text('payload').notNull(),
    result: text('result'),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('maxAttempts').default(3).notNull(),
    lastError: text('lastError'),
    usageLogId: uuid('usageLogId').references(() => usageLogs.id),
    nextRetryAt: timestamp('nextRetryAt', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completedAt', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('tasks_user_created_idx').on(table.userId, table.createdAt),
    index('tasks_status_next_retry_idx').on(table.status, table.nextRetryAt),
  ]
)

// ============================================================
// Relations
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  canvases: many(canvases),
  images: many(images),
  usageLogs: many(usageLogs),
  tasks: many(tasks),
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

export const canvasesRelations = relations(canvases, ({ one, many }) => ({
  user: one(users, {
    fields: [canvases.userId],
    references: [users.id],
  }),
  images: many(images),
}))

export const imagesRelations = relations(images, ({ one }) => ({
  user: one(users, {
    fields: [images.userId],
    references: [users.id],
  }),
  canvas: one(canvases, {
    fields: [images.canvasId],
    references: [canvases.id],
  }),
}))

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, {
    fields: [usageLogs.userId],
    references: [users.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}))
