'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createCanvasAction, renameCanvasAction } from '@/app/actions/canvas'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SaveStatus } from '@/lib/canvas/state'

export function CanvasToolbar({
  canvasId,
  initialName,
  status,
}: {
  canvasId: string
  initialName: string
  status: SaveStatus
}) {
  const router = useRouter()
  const { dictionary } = useLocale()
  const [name, setName] = useState(initialName)
  const [isPending, startTransition] = useTransition()

  const statusLabel =
    status === 'saving'
      ? dictionary.canvas.autosaveSaving
      : status === 'saved'
        ? dictionary.canvas.autosaveSaved
        : status === 'error'
          ? dictionary.canvas.autosaveError
          : dictionary.canvas.autosaveIdle

  function handleRename() {
    startTransition(async () => {
      try {
        const result = await renameCanvasAction(canvasId, name)
        setName(result.name)
        router.refresh()
      } catch {
        toast.error('Failed to rename canvas')
      }
    })
  }

  function handleCreate() {
    startTransition(async () => {
      try {
        const result = await createCanvasAction()
        router.push(`/canvas/${result.id}`)
        router.refresh()
      } catch {
        toast.error('Failed to create canvas')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/92 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 max-w-xl rounded-2xl"
          aria-label={dictionary.canvas.renameAction}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleRename}
          disabled={isPending}
          className="rounded-full"
        >
          {dictionary.canvas.renameAction}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <p className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          {statusLabel}
        </p>
        <Button type="button" onClick={handleCreate} disabled={isPending} className="rounded-full">
          <Plus className="size-4" />
          {dictionary.canvas.newCanvas}
        </Button>
      </div>
    </div>
  )
}
