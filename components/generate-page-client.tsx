'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { ScenarioGrid } from '@/components/scenario-grid'
import { ScenarioForm } from '@/components/scenario-form'
import { GenerateForm } from '@/components/generate-form'
import { PendingTaskBanner } from '@/components/pending-task-banner'
import type { ScenarioId } from '@/lib/scenarios'

export function GeneratePageClient() {
  const searchParams = useSearchParams()
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId | null>(null)
  const [, setResumedTaskId] = useState<string | null>(null)
  const { locale } = useLocale()
  const t = copy[locale].scenario

  // Auto-select freeform if URL params indicate it (from Gallery "Copy to Generate")
  useEffect(() => {
    if (searchParams.get('mode') === 'freeform') {
      setSelectedScenario('freeform')
    }
  }, [searchParams])

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
          initialQuality={searchParams.get('quality') ?? undefined}
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
      <PendingTaskBanner taskType="generate" onTaskFound={setResumedTaskId} />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.pageDescription}</p>
      </div>
      <ScenarioGrid onSelect={setSelectedScenario} />
    </div>
  )
}
