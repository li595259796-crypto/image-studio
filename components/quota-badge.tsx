'use client'

import { useLocale } from '@/components/locale-provider'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface QuotaBadgeProps {
  dailyUsed: number
  dailyLimit: number
}

export function QuotaBadge({ dailyUsed, dailyLimit }: QuotaBadgeProps) {
  const { dictionary } = useLocale()
  const percentage = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0

  const colorClass =
    percentage > 90
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : percentage >= 70
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'

  return (
    <Badge
      variant="outline"
      className={cn('border-none text-xs font-medium', colorClass)}
    >
      {dailyUsed}/{dailyLimit} {dictionary.nav.quotaToday}
    </Badge>
  )
}
