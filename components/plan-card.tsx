'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import type { Plan } from '@/lib/plans'

interface PlanCardProps {
  plan: Plan
}

export function PlanCard({ plan }: PlanCardProps) {
  const { locale } = useLocale()
  const t = copy[locale].upgrade

  function handleContact() {
    window.location.href = 'mailto:support@image-studio.site'
  }

  return (
    <Card className="h-full border border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="items-center text-center">
        <div className="text-lg font-semibold">{plan.name[locale]}</div>
        <div className="text-2xl font-bold tracking-tight">{plan.price[locale]}</div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3 text-sm text-muted-foreground">
          {plan.features[locale].map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="font-semibold text-primary">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {plan.ctaType === 'current' ? (
          <Button className="w-full" disabled>
            {t.currentPlan}
          </Button>
        ) : (
          <Button className="w-full" onClick={handleContact}>
            {t.contactUs}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
