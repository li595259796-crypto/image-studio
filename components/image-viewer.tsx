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
  DialogFooter,
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
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
      prompt: '保留主体，优化背景和光线',
    })
    router.push(`/edit?${params.toString()}`)
    onOpenChange(false)
  }

  function handleFavoriteToggle() {
    const nextValue = !currentImage.isFavorite
    onFavoriteChanged?.(currentImage.id, nextValue)

    startFavoriteTransition(async () => {
      const result = await toggleFavoriteAction(currentImage.id)

      if (!result.success || !result.data) {
        onFavoriteChanged?.(currentImage.id, currentImage.isFavorite)
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Image Details</DialogTitle>
          <DialogDescription className="sr-only">
            View and manage image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative min-h-64 overflow-hidden rounded-lg border">
            <Image
              src={currentImage.blobUrl ?? ''}
              alt={currentImage.prompt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>

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
              <span>{formatDate(currentImage.createdAt.toString())}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              handleDownload(
                currentImage.blobUrl ?? '',
                `image-${currentImage.id}.png`
              )
            }
          >
            <Download className="size-3.5" />
            {pt.download}
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyPrompt}>
            <Clipboard className="size-3.5" />
            {gt.copyPrompt}
          </Button>

          <Button
            variant="outline"
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
              ? image.isFavorite ? '取消收藏' : '收藏'
              : currentImage.isFavorite ? 'Unfavorite' : 'Favorite'}
          </Button>

          {/* Only show "Copy to Generate" for pure generate results */}
          {!isUploadType && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyToGenerate}>
              <Copy className="size-3.5" />
              {gt.copyToGenerate}
            </Button>
          )}

          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleContinueEdit}>
            <Pencil className="size-3.5" />
            {gt.continueEdit}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-1.5"
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

