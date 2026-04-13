import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { canvases } from '@/lib/db/schema'

export type CanvasStateRecord = Record<string, unknown>

export async function listCanvasesForUser(userId: string) {
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
}

export async function getCanvasByIdAndUser(userId: string, canvasId: string) {
  const result = await db
    .select()
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .limit(1)

  return result[0] ?? null
}

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
