import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { CanvasList } from '@/components/canvas/canvas-list'
import { CanvasEmptyState } from '@/components/canvas/canvas-empty-state'
import { listCanvasesForUser } from '@/lib/db/canvas-queries'

export default async function CanvasPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = session.user.id
  const canvases = await listCanvasesForUser(userId)

  if (canvases.length === 0) {
    return <CanvasEmptyState />
  }

  return <CanvasList canvases={canvases} />
}
