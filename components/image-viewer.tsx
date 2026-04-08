'use client'

import { useState, useTransition } from 'react'
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
          <div className="overflow-hidden rounded-lg border">
            <img
              src={image.public_url ?? ''}
              alt={image.prompt}
              className="w-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-foreground">
              {image.prompt}
            </p>
            <Separator />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{image.type}</Badge>
              {image.aspect_ratio && (
                <Badge variant="outline">{image.aspect_ratio}</Badge>
              )}
              <span>{formatDate(image.created_at)}</span>
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
            render={
              <a
                href={image.public_url ?? ''}
                download
                target="_blank"
                rel="noopener noreferrer"
                title="Download image"
              />
            }
          >
            <Download className="size-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
