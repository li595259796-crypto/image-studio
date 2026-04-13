import Link from 'next/link'
import { CalendarClock, ExternalLink } from 'lucide-react'
import type { CanvasListItem } from '@/lib/db/canvas-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { useLocale } from '@/components/locale-provider'
import { cn } from '@/lib/utils'

function formatTimestamp(value: Date, locale: 'zh' | 'en') {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function CanvasCard({ canvas }: { canvas: CanvasListItem }) {
  const { locale, dictionary } = useLocale()

  return (
    <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="aspect-[4/3] rounded-2xl border border-dashed border-border/80 bg-muted/50" />
        <div className="space-y-1">
          <CardTitle className="truncate text-base">{canvas.name}</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            <span>{formatTimestamp(canvas.lastOpenedAt ?? canvas.updatedAt, locale)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {dictionary.canvas.detailDescription}
        </div>
        <Link
          href={`/canvas/${canvas.id}`}
          className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 rounded-full')}
        >
          <ExternalLink className="size-4" />
          {dictionary.canvas.openAction}
        </Link>
      </CardContent>
    </Card>
  )
}
