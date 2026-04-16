'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { ScenarioGrid } from '@/components/scenario-grid'
import { ScenarioForm } from '@/components/scenario-form'
import { GenerateForm } from '@/components/generate-form'
import type { ScenarioId } from '@/lib/scenarios'

export function GeneratePageClient() {
  const searchParams = useSearchParams()
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId | null>(() =>
    searchParams.get('mode') === 'freeform' ? 'freeform' : null
  )
  const { locale } = useLocale()
  const t = copy[locale].scenario

  function handleBack() {
    setSelectedScenario(null)
  }

  if (selectedScenario === 'freeform') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <GenerateForm
          onBack={handleBack}
          initialPrompt={searchParams.get('prompt') ?? undefined}
          initialAspectRatio={searchParams.get('aspectRatio') ?? undefined}
        />
      </div>
    )
  }

  if (selectedScenario) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <ScenarioForm scenarioId={selectedScenario} onBack={handleBack} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.pageDescription}</p>
      </div>
      <ScenarioGrid onSelect={setSelectedScenario} />
    </div>
  )
}
