'use client'

import { useTransition } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { toggleFavoriteAction } from '@/app/actions/gallery'
import { cn } from '@/lib/utils'
import type { ImageRecord } from '@/lib/types'

interface ImageCardProps {
  image: ImageRecord
  onClick?: () => void
  onFavoriteChanged?: (imageId: string, isFavorite: boolean) => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ImageCard({
  image,
  onClick,
  onFavoriteChanged,
}: ImageCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleFavoriteToggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()

    const nextValue = !image.isFavorite
    onFavoriteChanged?.(image.id, nextValue)

    startTransition(async () => {
      const result = await toggleFavoriteAction(image.id)

      if (!result.success || !result.data) {
        onFavoriteChanged?.(image.id, image.isFavorite)
        toast.error(result.error ?? 'Failed to update favorite')
        return
      }

      onFavoriteChanged?.(image.id, result.data.isFavorite)
    })
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:scale-[1.02] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={image.blobUrl ?? ''}
            alt={image.prompt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <p className="line-clamp-2 text-sm leading-snug text-foreground">
            {image.prompt}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px]">
              {image.type}
            </Badge>
            {image.aspectRatio && (
              <Badge variant="outline" className="text-[10px]">
                {image.aspectRatio}
              </Badge>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {formatDate(image.createdAt.toString())}
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label={image.isFavorite ? 'Unfavorite image' : 'Favorite image'}
        disabled={isPending}
        onClick={handleFavoriteToggle}
        className={cn(
          'absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 text-white transition-opacity',
          image.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <Heart className="size-4" fill={image.isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
