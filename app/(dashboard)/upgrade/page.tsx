'use client'

import { PlanCard } from '@/components/plan-card'
import { useLocale } from '@/components/locale-provider'
import { plans } from '@/lib/plans'

export default function UpgradePage() {
  const { dictionary } = useLocale()
  const t = dictionary.upgrade

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-3xl space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t.pageDescription}
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </section>

      <p className="text-center text-sm text-muted-foreground">{t.contactEmail}</p>
    </div>
  )
}
