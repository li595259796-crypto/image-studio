'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createCanvasAction } from '@/app/actions/canvas'
import type { CanvasListItem } from '@/lib/db/canvas-queries'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { CanvasCard } from './canvas-card'

export function CanvasList({ canvases }: { canvases: CanvasListItem[] }) {
  const router = useRouter()
  const { dictionary } = useLocale()
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    startTransition(async () => {
      const result = await createCanvasAction()
      router.push(`/canvas/${result.id}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {dictionary.canvas.listTitle}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {dictionary.canvas.listDescription}
          </p>
        </div>
        <Button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="rounded-full"
        >
          <Plus className="size-4" />
          {dictionary.canvas.newCanvas}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canvases.map((canvas) => (
          <CanvasCard key={canvas.id} canvas={canvas} />
        ))}
      </div>
    </div>
  )
}
