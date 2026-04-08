'use client'

import { Badge } from '@/components/ui/badge'
import type { ImageRecord } from '@/lib/types'

interface ImageCardProps {
  image: ImageRecord
  onClick?: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:scale-[1.02] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-square w-full overflow-hidden">
        <img
          src={image.public_url ?? ''}
          alt={image.prompt}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
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
          {image.aspect_ratio && (
            <Badge variant="outline" className="text-[10px]">
              {image.aspect_ratio}
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">
            {formatDate(image.created_at)}
          </span>
        </div>
      </div>
    </button>
  )
}
