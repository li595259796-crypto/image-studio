import { eq, gte, and, count, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, images, usageLogs } from './schema'

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
