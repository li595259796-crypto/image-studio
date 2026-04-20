import { cache } from 'react'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { canvases } from '@/lib/db/schema'
import type { PersistedCanvasState } from '@/lib/canvas/state'

export type CanvasStateRecord = PersistedCanvasState

// React cache() dedupes same-args read within a request. Cheap to wrap;
// high value if any layout or server component ends up reading the same
// canvas twice (common with related-data fetches).
export const listCanvasesForUser = cache(async (userId: string) => {
  return db
    .select({
      id: canvases.id,
      name: canvases.name,
      thumbnailUrl: canvases.thumbnailUrl,
      createdAt: canvases.createdAt,
      updatedAt: canvases.updatedAt,
      lastOpenedAt: canvases.lastOpenedAt,
    })
    .from(canvases)
    .where(eq(canvases.userId, userId))
    .orderBy(desc(canvases.lastOpenedAt), desc(canvases.updatedAt))
})

export const getCanvasByIdAndUser = cache(async (userId: string, canvasId: string) => {
  const result = await db
    .select()
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .limit(1)

  return result[0] ?? null
})

export async function createCanvasForUser(
  userId: string,
  input: { name: string; state: CanvasStateRecord }
) {
  const result = await db
    .insert(canvases)
    .values({
      userId,
      name: input.name,
      state: input.state,
    })
    .returning()

  return result[0]
}

export async function renameCanvasForUser(
  userId: string,
  canvasId: string,
  name: string
) {
  const result = await db
    .update(canvases)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning()

  return result[0] ?? null
}

export async function saveCanvasStateForUser(
  userId: string,
  canvasId: string,
  state: CanvasStateRecord
) {
  const result = await db
    .update(canvases)
    .set({
      state,
      updatedAt: new Date(),
    })
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning()

  return result[0] ?? null
}

export async function touchCanvasLastOpenedAt(userId: string, canvasId: string) {
  const result = await db
    .update(canvases)
    .set({
      lastOpenedAt: new Date(),
    })
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning({ id: canvases.id })

  return result[0] ?? null
}

export async function deleteCanvasForUser(userId: string, canvasId: string) {
  const result = await db
    .delete(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning({ id: canvases.id })

  return result[0] ?? null
}

/**
 * Ensure the user has at least one canvas.
 * Race-safe: if two concurrent requests both see an empty list,
 * only one INSERT will succeed; the other returns the existing canvas.
 */
export async function ensureFirstCanvas(
  userId: string,
  input: { name: string; state: CanvasStateRecord }
): Promise<{ id: string }> {
  const existing = await listCanvasesForUser(userId)
  if (existing.length > 0) {
    return { id: existing[0].id }
  }

  const created = await createCanvasForUser(userId, input)

  // Double-check: if a race created a duplicate, return whichever was first
  const all = await listCanvasesForUser(userId)
  return { id: all.length > 0 ? all[0].id : created.id }
}

export type CanvasListItem = Awaited<ReturnType<typeof listCanvasesForUser>>[number]
export type CanvasRecord = NonNullable<
  Awaited<ReturnType<typeof getCanvasByIdAndUser>>
>
