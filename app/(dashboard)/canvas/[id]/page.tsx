import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { touchCanvasLastOpenedAt, getCanvasByIdAndUser } from '@/lib/db/canvas-queries'

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

  await touchCanvasLastOpenedAt(session.user.id, id)

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{canvas.name}</h1>
        <p className="text-sm text-muted-foreground">
          Canvas foundation is live. The Excalidraw workspace comes next.
        </p>
      </div>
      <div className="min-h-[540px] rounded-[28px] border border-dashed border-border/80 bg-muted/35" />
    </div>
  )
}
