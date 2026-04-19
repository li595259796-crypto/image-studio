import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  assertCanvasStateWithinLimit,
  parseCanvasState,
} from '@/lib/canvas/state'
import { saveCanvasStateForUser } from '@/lib/db/canvas-queries'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { canvasId?: string; state?: unknown }
  try {
    body = (await request.json()) as { canvasId?: string; state?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }

  if (!body.canvasId) {
    return NextResponse.json({ error: 'Canvas id is required' }, { status: 400 })
  }

  try {
    const state = parseCanvasState(body.state)
    assertCanvasStateWithinLimit(state)

    const canvas = await saveCanvasStateForUser(
      session.user.id,
      body.canvasId,
      state
    )

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id: canvas.id })
  } catch (error) {
    // parseCanvasState / assertCanvasStateWithinLimit throw controlled Error messages
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Invalid canvas state',
      },
      { status: 400 }
    )
  }
}
