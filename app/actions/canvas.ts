'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  createCanvasForUser,
  deleteCanvasForUser,
  renameCanvasForUser,
  saveCanvasStateForUser,
} from '@/lib/db/canvas-queries'
import {
  assertCanvasStateWithinLimit,
  createEmptyCanvasState,
  DEFAULT_CANVAS_NAME,
  parseCanvasState,
  sanitizeCanvasName,
} from '@/lib/canvas/state'

async function requireUserId(): Promise<string> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return session.user.id
}

export async function createCanvasAction(name?: string) {
  const userId = await requireUserId()
  const canvas = await createCanvasForUser(userId, {
    name: sanitizeCanvasName(name),
    state: createEmptyCanvasState(),
  })

  revalidatePath('/canvas')

  return { id: canvas.id }
}

export async function renameCanvasAction(canvasId: string, name: string) {
  const userId = await requireUserId()
  const canvas = await renameCanvasForUser(userId, canvasId, sanitizeCanvasName(name))

  if (!canvas) {
    throw new Error('Canvas not found')
  }

  revalidatePath('/canvas')
  revalidatePath(`/canvas/${canvasId}`)

  return { id: canvas.id, name: canvas.name }
}

export async function saveCanvasStateAction(
  canvasId: string,
  state: unknown
) {
  const userId = await requireUserId()

  // Structural validation — rejects malformed JSON before it hits the DB
  const validated = parseCanvasState(state)

  // Size check — rejects payloads exceeding 5MB
  assertCanvasStateWithinLimit(validated)

  const canvas = await saveCanvasStateForUser(userId, canvasId, validated)

  if (!canvas) {
    throw new Error('Canvas not found')
  }

  // Only revalidate the detail page, NOT the list page.
  // Autosave fires every ~800ms during active editing — revalidating
  // /canvas on each save wastes RSC re-renders for unchanged list data.
  revalidatePath(`/canvas/${canvasId}`)

  return { id: canvas.id }
}

export async function deleteCanvasAction(canvasId: string) {
  const userId = await requireUserId()
  const deleted = await deleteCanvasForUser(userId, canvasId)

  if (!deleted) {
    throw new Error('Canvas not found')
  }

  revalidatePath('/canvas')

  return { id: deleted.id }
}

export async function createFirstCanvasAction(): Promise<
  { success: true; id: string } | { success: false; error: string }
> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' }
  }
  try {
    const created = await createCanvasForUser(session.user.id, {
      name: DEFAULT_CANVAS_NAME,
      state: createEmptyCanvasState(),
    })
    return { success: true, id: created.id }
  } catch (error) {
    console.error('[canvas] createFirstCanvas failed', error)
    return { success: false, error: 'Failed to create canvas' }
  }
}
