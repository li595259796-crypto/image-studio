'use client'

import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { scenarios, type ScenarioId } from '@/lib/scenarios'

interface ScenarioGridProps {
  onSelect: (scenarioId: ScenarioId) => void
}

export function ScenarioGrid({ onSelect }: ScenarioGridProps) {
  const { locale } = useLocale()
  const t = copy[locale].scenario

  const scenarioI18n: Record<ScenarioId, { name: string; subtitle: string }> = {
    product: { name: t.product.name, subtitle: t.product.subtitle },
    cover: { name: t.cover.name, subtitle: t.cover.subtitle },
    poster: { name: t.poster.name, subtitle: t.poster.subtitle },
    portrait: { name: t.portrait.name, subtitle: t.portrait.subtitle },
    illustration: { name: t.illustration.name, subtitle: t.illustration.subtitle },
    freeform: { name: t.freeform.name, subtitle: t.freeform.subtitle },
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {scenarios.map((scenario) => {
        const i18n = scenarioI18n[scenario.id]
        return (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onSelect(scenario.id)}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-md"
          >
            <span className="text-3xl">{scenario.icon}</span>
            <span className="font-medium">{i18n.name}</span>
            <span className="text-xs text-muted-foreground">{i18n.subtitle}</span>
          </button>
        )
      })}
    </div>
  )
}
