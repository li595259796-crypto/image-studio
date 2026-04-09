'use client'

import { useRouter } from 'next/navigation'
import { Download, Pencil, RefreshCw, Clipboard } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'

interface PostActionsProps {
  imageUrl: string
  imageId: string
  prompt: string
  isUploadType: boolean
  editIntent: string
  onRetry: () => void
  retrying?: boolean
}

export function PostActions({
  imageUrl,
  imageId,
  prompt,
  isUploadType,
  editIntent,
  onRetry,
  retrying,
}: PostActionsProps) {
  const router = useRouter()
  const { locale } = useLocale()
  const t = copy[locale].postAction

  async function handleDownload() {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `image-${imageId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }

  function handleContinueEdit() {
    const params = new URLSearchParams({
      sourceUrl: imageUrl,
      prompt: editIntent,
    })
    router.push(`/edit?${params.toString()}`)
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(prompt)
    toast.success(t.copiedToast)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
        <Download className="size-3.5" />
        {t.download}
      </Button>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleContinueEdit}>
        <Pencil className="size-3.5" />
        {t.continueEdit}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onRetry}
        disabled={retrying}
      >
        <RefreshCw className="size-3.5" />
        {isUploadType ? t.retryWithSource : t.retry}
        <span className="text-xs text-muted-foreground">({t.quotaNote})</span>
      </Button>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyPrompt}>
        <Clipboard className="size-3.5" />
        {t.copyPrompt}
      </Button>
    </div>
  )
}
