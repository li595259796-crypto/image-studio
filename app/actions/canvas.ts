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
  sanitizeCanvasName,
  type PersistedCanvasState,
} from '@/lib/canvas/state'

async function requireUserId() {
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
  state: PersistedCanvasState
) {
  const userId = await requireUserId()
  assertCanvasStateWithinLimit(state)

  const canvas = await saveCanvasStateForUser(userId, canvasId, state)

  if (!canvas) {
    throw new Error('Canvas not found')
  }

  revalidatePath('/canvas')
  revalidatePath(`/canvas/${canvasId}`)

  return { id: canvas.id, updatedAt: canvas.updatedAt }
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
