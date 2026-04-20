import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { touchCanvasLastOpenedAt, getCanvasByIdAndUser } from '@/lib/db/canvas-queries'
import { listRecoverableGenerationJobsForCanvas } from '@/lib/db/generation-queries'
import { CanvasWorkspace } from '@/components/canvas/canvas-workspace'

export default async function CanvasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params
  const userId = session.user.id

  // Parallelize the two reads — they're independent. Previously serial: each
  // Neon round-trip added ~100-200ms, stacking to 300ms+ on a cold lambda.
  const [canvas, recoverableJobs] = await Promise.all([
    getCanvasByIdAndUser(userId, id),
    listRecoverableGenerationJobsForCanvas(userId, id),
  ])

  if (!canvas) {
    notFound()
  }

  // Fire-and-forget the bookkeeping write. User should not wait for a
  // `last_opened_at` update to see their canvas — saves 1 DB RTT per visit.
  touchCanvasLastOpenedAt(userId, id).catch((err: unknown) => {
    console.error('[canvas-detail] touchCanvasLastOpenedAt failed', err)
  })

  return <CanvasWorkspace canvas={canvas} recoverableJobs={recoverableJobs} />
}
