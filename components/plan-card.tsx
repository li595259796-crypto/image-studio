'use client'

import { Check } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/plans'

interface PlanCardProps {
  plan: Plan
  recommended?: boolean
}

export function PlanCard({ plan, recommended = false }: PlanCardProps) {
  const { locale } = useLocale()
  const t = copy[locale].upgrade

  function handleContact() {
    window.location.href = 'mailto:support@image-studio.site'
  }

  return (
    <div className="relative">
      {recommended && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
            {locale === 'zh' ? '最受欢迎' : 'Most Popular'}
          </span>
        </div>
      )}
      <Card
        className={cn(
          'h-full border transition-all',
          recommended
            ? 'scale-[1.02] border-primary/50 ring-2 ring-primary/15 shadow-[0_16px_40px_rgba(34,24,10,0.12)]'
            : 'border-border/70 bg-card/90 shadow-sm hover:shadow-md'
        )}
      >
        <CardHeader className="items-center pb-4 text-center">
          <div className={cn('text-sm font-medium', recommended ? 'text-primary' : 'text-muted-foreground')}>
            {plan.name[locale]}
          </div>
          <div className="text-3xl font-bold tracking-tight">{plan.price[locale]}</div>
        </CardHeader>
        <CardContent className="flex-1">
          <ul className="space-y-2.5">
            {plan.features[locale].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className={cn('mt-0.5 size-4 shrink-0', recommended ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          {plan.ctaType === 'current' ? (
            <Button className="w-full" variant="outline" disabled>
              {t.currentPlan}
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={recommended ? 'default' : 'outline'}
              onClick={handleContact}
            >
              {t.contactUs}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
