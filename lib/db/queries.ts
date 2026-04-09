import { eq, gte, and, count, desc, lte, sql, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getGallerySinceDate, type GalleryTimeRange } from '@/lib/gallery'
import { users, images, usageLogs, tasks } from './schema'

export async function getUserById(userId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return result[0] ?? null
}

export async function getUserProfile(userId: string) {
  const result = await db
    .select({
      name: users.name,
      email: users.email,
      image: users.image,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return result[0] ?? null
}

export async function updateUserLocale(userId: string, locale: string) {
  await db.update(users).set({ locale }).where(eq(users.id, userId))
}

export async function getQuotaInfo(userId: string): Promise<{
  dailyUsed: number
  dailyLimit: number
  monthlyUsed: number
  monthlyLimit: number
  allowed: boolean
}> {
  const user = await getUserById(userId)

  if (!user) {
    throw new Error('User not found')
  }

  const dailyLimit = user.dailyQuota
  const monthlyLimit = user.monthlyQuota

  const now = new Date()
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )

  const [dailyResult, monthlyResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          gte(usageLogs.createdAt, startOfDay)
        )
      ),
    db
      .select({ value: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          gte(usageLogs.createdAt, startOfMonth)
        )
      ),
  ])

  const dailyUsed = dailyResult[0]?.value ?? 0
  const monthlyUsed = monthlyResult[0]?.value ?? 0

  return {
    dailyUsed,
    dailyLimit,
    monthlyUsed,
    monthlyLimit,
    allowed: dailyUsed < dailyLimit && monthlyUsed < monthlyLimit,
  }
}

export async function recordUsage(
  userId: string,
  action: 'generate' | 'edit'
): Promise<void> {
  await db.insert(usageLogs).values({
    userId,
    action,
  })
}

export async function getImageByIdAndUser(
  imageId: string,
  userId: string
): Promise<typeof images.$inferSelect | null> {
  const result = await db
    .select()
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))
    .limit(1)

  return result[0] ?? null
}

export async function getUserImages(
  userId: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ images: (typeof images.$inferSelect)[]; total: number }> {
  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(images)
      .where(eq(images.userId, userId))
      .orderBy(desc(images.createdAt))
      .offset(offset)
      .limit(limit),
    db
      .select({ value: count() })
      .from(images)
      .where(eq(images.userId, userId)),
  ])

  return {
    images: rows,
    total: totalResult[0]?.value ?? 0,
  }
}

export async function getUserImagesFiltered(
  userId: string,
  offset: number = 0,
  limit: number = 20,
  filters?: {
    favoriteOnly?: boolean
    timeRange?: GalleryTimeRange
  }
): Promise<{ images: (typeof images.$inferSelect)[]; total: number }> {
  const conditions = [eq(images.userId, userId)]

  if (filters?.favoriteOnly) {
    conditions.push(eq(images.isFavorite, true))
  }

  if (filters?.timeRange) {
    conditions.push(gte(images.createdAt, getGallerySinceDate(filters.timeRange)))
  }

  const whereClause = and(...conditions)

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(images)
      .where(whereClause)
      .orderBy(desc(images.createdAt))
      .offset(offset)
      .limit(limit),
    db
      .select({ value: count() })
      .from(images)
      .where(whereClause),
  ])

  return {
    images: rows,
    total: totalResult[0]?.value ?? 0,
  }
}

export async function toggleImageFavorite(
  imageId: string,
  userId: string
): Promise<boolean | null> {
  const image = await db
    .select({ isFavorite: images.isFavorite })
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!image) {
    return null
  }

  const nextValue = !image.isFavorite

  await db
    .update(images)
    .set({ isFavorite: nextValue })
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))

  return nextValue
}

export async function insertImage(
  data: typeof images.$inferInsert
): Promise<typeof images.$inferSelect> {
  const result = await db.insert(images).values(data).returning()

  return result[0]
}

export async function deleteImage(
  imageId: string,
  userId: string
): Promise<void> {
  await db
    .delete(images)
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))
}

export async function recordUsageReturningId(
  userId: string,
  action: 'generate' | 'edit'
): Promise<string> {
  const result = await db
    .insert(usageLogs)
    .values({ userId, action })
    .returning({ id: usageLogs.id })
  return result[0].id
}

export async function createTask(data: {
  userId: string
  type: 'generate' | 'edit'
  payload: string
  usageLogId: string
}): Promise<string> {
  const result = await db
    .insert(tasks)
    .values({
      userId: data.userId,
      type: data.type,
      payload: data.payload,
      usageLogId: data.usageLogId,
    })
    .returning({ id: tasks.id })
  return result[0].id
}

export async function getTaskById(
  taskId: string,
  userId: string
): Promise<typeof tasks.$inferSelect | null> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)
  return result[0] ?? null
}

export async function getRecentPendingTaskByType(
  userId: string,
  type: 'generate' | 'edit'
): Promise<typeof tasks.$inferSelect | null> {
  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.type, type),
        or(eq(tasks.status, 'pending'), eq(tasks.status, 'processing'))
      )
    )
    .orderBy(desc(tasks.createdAt))
    .limit(1)
  return result[0] ?? null
}

export async function claimNextTask(): Promise<typeof tasks.$inferSelect | null> {
  const result = await db.execute(sql`
    WITH next_task AS (
      SELECT id FROM tasks
      WHERE status = 'pending'
        AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= now())
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE tasks SET status = 'processing', "updatedAt" = now()
    FROM next_task WHERE tasks.id = next_task.id
    RETURNING tasks.*
  `)
  const row = result.rows[0]
  if (!row) return null

  return {
    id: row.id as string,
    userId: row.userId as string,
    type: row.type as 'generate' | 'edit',
    status: 'processing' as const,
    payload: row.payload as string,
    result: row.result as string | null,
    attempts: row.attempts as number,
    maxAttempts: row.maxAttempts as number,
    lastError: row.lastError as string | null,
    usageLogId: row.usageLogId as string | null,
    nextRetryAt: row.nextRetryAt ? new Date(row.nextRetryAt as string) : null,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    completedAt: row.completedAt ? new Date(row.completedAt as string) : null,
  }
}

export async function saveTaskResult(
  taskId: string,
  result: { imageId: string; blobUrl: string }
): Promise<void> {
  await db
    .update(tasks)
    .set({
      result: JSON.stringify(result),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function markTaskCompleted(
  taskId: string,
  result: { imageId: string; blobUrl: string }
): Promise<void> {
  await db
    .update(tasks)
    .set({
      status: 'completed',
      result: JSON.stringify(result),
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function markTaskRetryable(
  taskId: string,
  error: string,
  currentAttempts: number
): Promise<void> {
  const delaySeconds = 10 * Math.pow(3, currentAttempts)
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000)

  await db
    .update(tasks)
    .set({
      status: 'pending',
      attempts: currentAttempts + 1,
      lastError: error,
      nextRetryAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function markTaskFailed(
  taskId: string,
  error: string,
  currentAttempts: number
): Promise<void> {
  await db
    .update(tasks)
    .set({
      status: 'failed',
      attempts: currentAttempts + 1,
      lastError: error,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function resetTaskForRetry(
  taskId: string,
  newUsageLogId: string
): Promise<void> {
  await db
    .update(tasks)
    .set({
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      nextRetryAt: null,
      result: null,
      completedAt: null,
      usageLogId: newUsageLogId,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function deleteUsageLog(usageLogId: string): Promise<void> {
  await db.delete(usageLogs).where(eq(usageLogs.id, usageLogId))
}

export async function recoverZombieTasks(): Promise<number> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const zombies = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'processing'),
        lte(tasks.updatedAt, tenMinutesAgo)
      )
    )

  let recovered = 0
  for (const zombie of zombies) {
    const nextAttempts = zombie.attempts + 1
    if (nextAttempts >= zombie.maxAttempts) {
      await markTaskFailed(zombie.id, 'Worker timeout (zombie recovery)', zombie.attempts)
      if (zombie.usageLogId) {
        await deleteUsageLog(zombie.usageLogId)
      }
    } else {
      await markTaskRetryable(zombie.id, 'Worker timeout (zombie recovery)', zombie.attempts)
    }
    recovered++
  }

  return recovered
}
