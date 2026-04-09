'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Download, Trash2, Loader2 } from 'lucide-react'
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
import { deleteImageAction } from '@/app/actions/gallery'
import type { ImageRecord } from '@/lib/types'

interface ImageViewerProps {
  image: ImageRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (imageId: string) => void
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
}: ImageViewerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startTransition] = useTransition()

  if (!image) return null

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
      const res = await deleteImageAction(image!.id)
      if (res.success) {
        onDeleted?.(image!.id)
        onOpenChange(false)
        setConfirmDelete(false)
      }
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
              src={image.blobUrl ?? ''}
              alt={image.prompt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-foreground">
              {image.prompt}
            </p>
            <Separator />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{image.type}</Badge>
              {image.aspectRatio && (
                <Badge variant="outline">{image.aspectRatio}</Badge>
              )}
              <span>{formatDate(image.createdAt.toString())}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleDownload(image.blobUrl ?? '', `image-${image.id}.png`)}
          >
            <Download className="size-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
