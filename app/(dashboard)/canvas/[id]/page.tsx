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
  const canvas = await getCanvasByIdAndUser(session.user.id, id)

  if (!canvas) {
    notFound()
  }

  const recoverableJobs = await listRecoverableGenerationJobsForCanvas(
    session.user.id,
    id
  )

  await touchCanvasLastOpenedAt(session.user.id, id)

  return <CanvasWorkspace canvas={canvas} recoverableJobs={recoverableJobs} />
}
