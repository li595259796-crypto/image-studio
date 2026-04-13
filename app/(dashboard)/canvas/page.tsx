import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { CanvasList } from '@/components/canvas/canvas-list'
import { createEmptyCanvasState, DEFAULT_CANVAS_NAME } from '@/lib/canvas/state'
import { ensureFirstCanvas, listCanvasesForUser } from '@/lib/db/canvas-queries'

export default async function CanvasPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = session.user.id
  const canvases = await listCanvasesForUser(userId)

  if (canvases.length === 0) {
    const first = await ensureFirstCanvas(userId, {
      name: DEFAULT_CANVAS_NAME,
      state: createEmptyCanvasState(),
    })

    redirect(`/canvas/${first.id}`)
  }

  return <CanvasList canvases={canvases} />
}
