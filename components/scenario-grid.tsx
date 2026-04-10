'use client'

import { ArrowRight } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { scenarios, type ScenarioId } from '@/lib/scenarios'
import { cn } from '@/lib/utils'

interface ScenarioGridProps {
  onSelect: (scenarioId: ScenarioId) => void
}

const scenarioStyles: Record<ScenarioId, { gradient: string; icon: string }> = {
  product: {
    gradient: 'from-amber-50 to-orange-50 border-amber-200/70 hover:border-amber-300',
    icon: 'bg-amber-100 text-amber-700',
  },
  cover: {
    gradient: 'from-blue-50 to-indigo-50 border-blue-200/70 hover:border-blue-300',
    icon: 'bg-blue-100 text-blue-700',
  },
  poster: {
    gradient: 'from-violet-50 to-purple-50 border-violet-200/70 hover:border-violet-300',
    icon: 'bg-violet-100 text-violet-700',
  },
  portrait: {
    gradient: 'from-rose-50 to-pink-50 border-rose-200/70 hover:border-rose-300',
    icon: 'bg-rose-100 text-rose-700',
  },
  illustration: {
    gradient: 'from-teal-50 to-emerald-50 border-teal-200/70 hover:border-teal-300',
    icon: 'bg-teal-100 text-teal-700',
  },
  freeform: {
    gradient: 'from-slate-50 to-zinc-100 border-slate-200/70 hover:border-slate-300',
    icon: 'bg-slate-100 text-slate-600',
  },
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {scenarios.map((scenario) => {
        const i18n = scenarioI18n[scenario.id]
        const style = scenarioStyles[scenario.id]
        return (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onSelect(scenario.id)}
            className={cn(
              'group relative flex flex-col items-start gap-3 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all duration-200',
              'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              style.gradient
            )}
          >
            <div className={cn('flex size-10 items-center justify-center rounded-xl text-xl', style.icon)}>
              {scenario.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{i18n.name}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{i18n.subtitle}</p>
            </div>
            <ArrowRight className="absolute right-3 bottom-3 size-3.5 text-muted-foreground/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
          </button>
        )
      })}
    </div>
  )
}
