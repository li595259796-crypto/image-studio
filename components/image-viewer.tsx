'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Download, Trash2, Loader2, Clipboard, Pencil, Copy, Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { deleteImageAction, toggleFavoriteAction } from '@/app/actions/gallery'
import type { ImageRecord } from '@/lib/types'

interface ImageViewerProps {
  image: ImageRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (imageId: string) => void
  onFavoriteChanged?: (imageId: string, isFavorite: boolean) => void
}

function formatDate(dateString: string, locale: 'zh' | 'en'): string {
  return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ImageViewer({
  image,
  open,
  onOpenChange,
  onDeleted,
  onFavoriteChanged,
}: ImageViewerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startTransition] = useTransition()
  const [isFavoritePending, startFavoriteTransition] = useTransition()
  const router = useRouter()
  const { locale } = useLocale()
  const gt = copy[locale].gallery
  const pt = copy[locale].postAction

  const isUploadType = image?.type === 'edit'

  if (!image) return null
  const currentImage = image

  async function handleDownload(url: string, filename: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    startTransition(async () => {
      const res = await deleteImageAction(currentImage.id)
      if (res.success) {
        onDeleted?.(currentImage.id)
        onOpenChange(false)
        setConfirmDelete(false)
      }
    })
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(currentImage.prompt)
    toast.success(pt.copiedToast)
  }

  function handleCopyToGenerate() {
    const params = new URLSearchParams({
      prompt: currentImage.prompt,
      ...(currentImage.aspectRatio ? { aspectRatio: currentImage.aspectRatio } : {}),
      ...(currentImage.quality ? { quality: currentImage.quality } : {}),
    })
    router.push(`/generate?mode=freeform&${params.toString()}`)
    onOpenChange(false)
  }

  function handleContinueEdit() {
    const params = new URLSearchParams({
      sourceUrl: currentImage.blobUrl,
      prompt: gt.defaultEditIntent,
    })
    router.push(`/edit?${params.toString()}`)
    onOpenChange(false)
  }

  function handleFavoriteToggle() {
    const previousValue = currentImage.isFavorite
    const nextValue = !previousValue
    onFavoriteChanged?.(currentImage.id, nextValue)

    startFavoriteTransition(async () => {
      const result = await toggleFavoriteAction(currentImage.id)

      if (!result.success || !result.data) {
        onFavoriteChanged?.(currentImage.id, previousValue)
        toast.error(result.error ?? 'Failed to update favorite')
        return
      }

      onFavoriteChanged?.(currentImage.id, result.data.isFavorite)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val)
        if (!val) setConfirmDelete(false)
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">{gt.detailsTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            {gt.detailsDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div className="relative min-h-72 overflow-hidden rounded-xl border bg-muted/30 sm:min-h-[420px]">
            <Image
              src={currentImage.blobUrl ?? ''}
              alt={currentImage.prompt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>

          {/* Prompt & metadata */}
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-foreground">
              {currentImage.prompt}
            </p>
            <Separator />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{currentImage.type}</Badge>
              {currentImage.aspectRatio && (
                <Badge variant="outline">{currentImage.aspectRatio}</Badge>
              )}
              <span className="ml-auto">{formatDate(currentImage.createdAt.toString(), locale)}</span>
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => handleDownload(currentImage.blobUrl ?? '', `image-${currentImage.id}.png`)}
            >
              <Download className="size-3.5" />
              {pt.download}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleContinueEdit}
            >
              <Pencil className="size-3.5" />
              {gt.continueEdit}
            </Button>

            {!isUploadType && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyToGenerate}>
                <Copy className="size-3.5" />
                {gt.copyToGenerate}
              </Button>
            )}
          </div>

          {/* Secondary actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleCopyPrompt}>
              <Clipboard className="size-3.5" />
              {gt.copyPrompt}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={handleFavoriteToggle}
              disabled={isFavoritePending}
            >
              <Heart
                className="size-3.5"
                fill={currentImage.isFavorite ? 'currentColor' : 'none'}
              />
              {locale === 'zh'
                ? currentImage.isFavorite ? '取消收藏' : '收藏'
                : currentImage.isFavorite ? 'Unfavorite' : 'Favorite'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="ml-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {confirmDelete
                ? locale === 'zh' ? '确认删除' : 'Confirm Delete'
                : locale === 'zh' ? '删除' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
