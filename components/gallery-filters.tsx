'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'

export type TimeRange = 'all' | 'today' | '7d' | '30d'

interface GalleryFiltersProps {
  timeRange: TimeRange
  onTimeRangeChange: (timeRange: TimeRange) => void
  favoriteOnly: boolean
  onFavoriteToggle: () => void
}

export function GalleryFilters({
  timeRange,
  onTimeRangeChange,
  favoriteOnly,
  onFavoriteToggle,
}: GalleryFiltersProps) {
  const { locale } = useLocale()
  const t = copy[locale].galleryFilter

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
        <SelectTrigger className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.all}</SelectItem>
          <SelectItem value="today">{t.today}</SelectItem>
          <SelectItem value="7d">{t.last7Days}</SelectItem>
          <SelectItem value="30d">{t.last30Days}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={favoriteOnly ? 'default' : 'outline'}
        size="sm"
        className="gap-2"
        onClick={onFavoriteToggle}
      >
        <Heart
          className="size-4"
          fill={favoriteOnly ? 'currentColor' : 'none'}
        />
        {t.favoritesOnly}
      </Button>
    </div>
  )
}
