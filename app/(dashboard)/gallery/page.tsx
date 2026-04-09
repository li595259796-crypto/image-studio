'use client'

import { useEffect, useRef, useState, useCallback, useTransition } from 'react'
import { ImageGrid } from '@/components/image-grid'
import { getImages } from '@/app/actions/gallery'
import type { ImageRecord } from '@/lib/types'

const PAGE_SIZE = 20

export default function GalleryPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [total, setTotal] = useState(0)
  const [isPending, startTransition] = useTransition()
  const loadedRef = useRef(false)

  const loadImages = useCallback(
    (offset: number) => {
      startTransition(async () => {
        const res = await getImages(offset, PAGE_SIZE)
        if (res.success && res.data) {
          setImages((prev) =>
            offset === 0 ? res.data!.images : [...prev, ...res.data!.images]
          )
          setTotal(res.data.total)
        }
      })
    },
    []
  )

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadImages(0)
    }
  }, [loadImages])

  function handleLoadMore() {
    loadImages(images.length)
  }

  function handleImageDeleted(imageId: string) {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    setTotal((prev) => prev - 1)
  }

  const hasMore = images.length < total

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total} image${total === 1 ? '' : 's'} in your collection`
            : 'Your generated and edited images will appear here.'}
        </p>
      </div>
      <ImageGrid
        images={images}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={isPending}
        onImageDeleted={handleImageDeleted}
      />
    </div>
  )
}
