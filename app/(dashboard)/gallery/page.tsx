'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { GalleryFilters, type TimeRange } from '@/components/gallery-filters'
import { ImageGrid } from '@/components/image-grid'
import { getImages } from '@/app/actions/gallery'
import { useLocale } from '@/components/locale-provider'
import type { ImageRecord } from '@/lib/types'

const PAGE_SIZE = 20

export default function GalleryPage() {
  const { locale, dictionary } = useLocale()
  const [images, setImages] = useState<ImageRecord[]>([])
  const [total, setTotal] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [favoriteOnly, setFavoriteOnly] = useState(false)

  const loadImages = useCallback(
    (
      offset: number,
      filters?: {
        favoriteOnly?: boolean
        timeRange?: 'today' | '7d' | '30d'
      }
    ) => {
      startTransition(async () => {
        if (offset === 0) {
          setImages([])
          setTotal(0)
        }

        const res = await getImages(offset, PAGE_SIZE, filters)
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
    loadImages(0, {
      favoriteOnly: favoriteOnly || undefined,
      timeRange: timeRange === 'all' ? undefined : timeRange,
    })
  }, [favoriteOnly, loadImages, timeRange])

  function handleLoadMore() {
    loadImages(images.length, {
      favoriteOnly: favoriteOnly || undefined,
      timeRange: timeRange === 'all' ? undefined : timeRange,
    })
  }

  function handleImageDeleted(imageId: string) {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    setTotal((prev) => prev - 1)
  }

  function handleFavoriteChanged(imageId: string, isFavorite: boolean) {
    setImages((prev) => {
      const nextImages = prev.map((image) =>
        image.id === imageId ? { ...image, isFavorite } : image
      )

      return favoriteOnly
        ? nextImages.filter((image) => image.isFavorite)
        : nextImages
    })
    if (favoriteOnly && !isFavorite) {
      setTotal((prev) => Math.max(0, prev - 1))
    }
  }

  const hasMore = images.length < total
  const isFiltered = favoriteOnly || timeRange !== 'all'
  const summary =
    total > 0
      ? locale === 'zh'
        ? `共 ${total} 张作品`
        : `${total} image${total === 1 ? '' : 's'} in your library`
      : dictionary.gallery.libraryDescription

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {dictionary.gallery.libraryTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>

        <GalleryFilters
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          favoriteOnly={favoriteOnly}
          onFavoriteToggle={() => setFavoriteOnly((prev) => !prev)}
        />
      </div>
      <ImageGrid
        images={images}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={isPending}
        isFiltered={isFiltered}
        onImageDeleted={handleImageDeleted}
        onFavoriteChanged={handleFavoriteChanged}
      />
    </div>
  )
}
