'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ImagePlus, Loader2 } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { createFirstCanvasAction } from '@/app/actions/canvas'

export function CanvasEmptyState() {
  const router = useRouter()
  const { dictionary } = useLocale()
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    startTransition(async () => {
      const result = await createFirstCanvasAction()
      if (!result.success) {
        toast.error(result.error ?? dictionary.canvas.createFailed)
        return
      }
      router.push(`/canvas/${result.id}`)
    })
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <ImagePlus className="size-8 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold">
          {dictionary.canvas.emptyTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dictionary.canvas.emptyDescription}
        </p>
      </div>
      <Button onClick={handleCreate} disabled={isPending} size="lg" className="gap-2">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {dictionary.canvas.newCanvas}
      </Button>
    </div>
  )
}
