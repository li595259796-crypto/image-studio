'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageCard } from '@/components/image-card'
import { ImageViewer } from '@/components/image-viewer'
import type { ImageRecord } from '@/lib/types'

interface ImageGridProps {
  images: ImageRecord[]
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
  isFiltered?: boolean
  onImageDeleted?: (imageId: string) => void
  onFavoriteChanged?: (imageId: string, isFavorite: boolean) => void
}

export function ImageGrid({
  images,
  onLoadMore,
  hasMore,
  loading,
  isFiltered = false,
  onImageDeleted,
  onFavoriteChanged,
}: ImageGridProps) {
  const { locale, dictionary } = useLocale()
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  function handleCardClick(image: ImageRecord) {
    setSelectedImage(image)
    setViewerOpen(true)
  }

  function handleDeleted(imageId: string) {
    onImageDeleted?.(imageId)
    setViewerOpen(false)
    setSelectedImage(null)
  }

  function handleFavoriteChanged(imageId: string, isFavorite: boolean) {
    onFavoriteChanged?.(imageId, isFavorite)

    setSelectedImage((prev) =>
      prev?.id === imageId ? { ...prev, isFavorite } : prev
    )
  }

  if (!loading && images.length === 0) {
    const emptyTitle = isFiltered
      ? dictionary.gallery.filteredEmptyTitle
      : dictionary.gallery.emptyTitle
    const emptyDescription = isFiltered
      ? dictionary.gallery.filteredEmptyDescription
      : dictionary.gallery.emptyDescription

    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {emptyTitle}
        </p>
        <p className="text-sm text-muted-foreground/70">
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onClick={() => handleCardClick(image)}
            onFavoriteChanged={handleFavoriteChanged}
          />
        ))}
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {locale === 'zh' ? '加载更多' : 'Load More'}
          </Button>
        </div>
      )}

      <ImageViewer
        image={selectedImage}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onDeleted={handleDeleted}
        onFavoriteChanged={handleFavoriteChanged}
      />
    </div>
  )
}
