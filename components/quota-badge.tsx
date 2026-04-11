'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/locale-provider'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface QuotaBadgeProps {
  dailyUsed: number
  dailyLimit: number
  className?: string
  variant?: 'badge' | 'panel'
}

export function QuotaBadge({
  dailyUsed,
  dailyLimit,
  className,
  variant = 'badge',
}: QuotaBadgeProps) {
  const router = useRouter()
  const { dictionary } = useLocale()
  const percentage = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0

  const colorClass =
    percentage > 90
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : percentage >= 70
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'

  if (variant === 'panel') {
    return (
      <button
        type="button"
        onClick={() => router.push('/upgrade')}
        className={cn(
          'cursor-pointer rounded-2xl border border-border/70 bg-background/80 p-3 text-left transition-colors hover:bg-muted/50',
          className
        )}
      >
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {dictionary.nav.quotaToday}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {dailyUsed}/{dailyLimit}
          </p>
          <Badge variant="outline" className={cn('border-none text-xs font-medium', colorClass)}>
            {Math.round(percentage)}%
          </Badge>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/upgrade')}
      className={cn('cursor-pointer', className)}
    >
      <Badge variant="outline" className={cn('border-none text-xs font-medium', colorClass)}>
        {dailyUsed}/{dailyLimit} {dictionary.nav.quotaToday}
      </Badge>
    </button>
  )
}
