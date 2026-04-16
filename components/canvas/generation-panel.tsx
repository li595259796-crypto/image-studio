'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useLocale } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  MODEL_DEFINITIONS,
  VALID_ASPECT_RATIOS,
} from '@/lib/models/constants'
import type { ModelId } from '@/lib/models/types'
import {
  useCanvasGenerationStream,
  type GenerationClientJob,
} from '@/hooks/use-canvas-generation-stream'
import { GenerationResultStrip } from './generation-result-strip'

const DEFAULT_MODEL_IDS: ModelId[] = ['gemini-3.1-flash']

export function GenerationPanel({
  canvasId,
  onStart,
  onCompleted,
  onFailed,
  className,
}: {
  canvasId: string
  onStart?: (
    items: Array<{
      modelId: ModelId
      modelLabel: string
      index: number
      placeholderKey: string
    }>
  ) => void
  onCompleted?: (job: GenerationClientJob) => void | Promise<void>
  onFailed?: (job: GenerationClientJob) => void | Promise<void>
  className?: string
}) {
  const { dictionary } = useLocale()
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] =
    useState<(typeof VALID_ASPECT_RATIOS)[number]>('1:1')
  const [selectedModelIds, setSelectedModelIds] =
    useState<ModelId[]>(DEFAULT_MODEL_IDS)

  const {
    jobs,
    error,
    isSubmitting,
    isStreaming,
    clearFinishedJobs,
    startGeneration,
  } = useCanvasGenerationStream()

  const canSubmit = prompt.trim().length > 0 && selectedModelIds.length > 0

  const selectedCountLabel = useMemo(
    () => `${selectedModelIds.length} / ${MODEL_DEFINITIONS.length}`,
    [selectedModelIds.length]
  )

  function toggleModel(modelId: ModelId) {
    setSelectedModelIds((current) =>
      current.includes(modelId)
        ? current.filter((item) => item !== modelId)
        : [...current, modelId]
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      return
    }

    await startGeneration({
      canvasId,
      prompt,
      aspectRatio,
      modelIds: selectedModelIds,
      onStart,
      onCompleted,
      onFailed,
    })
  }

  return (
    <div className={cn('space-y-4 xl:sticky xl:top-6', className)}>
      <Card className="border-border/70">
        <CardHeader className="border-b">
          <CardTitle>{dictionary.canvas.panelTitle}</CardTitle>
          <CardDescription>{dictionary.canvas.panelDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  {dictionary.scenario.descriptionLabel}
                </p>
                <Badge variant="outline">{selectedCountLabel}</Badge>
              </div>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={dictionary.scenario.freeform.subtitle}
                className="min-h-32 rounded-3xl"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {dictionary.canvas.modelLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {MODEL_DEFINITIONS.map((model) => {
                  const selected = selectedModelIds.includes(model.id)
                  return (
                    <Button
                      key={model.id}
                      type="button"
                      size="sm"
                      variant={selected ? 'secondary' : 'outline'}
                      onClick={() => toggleModel(model.id)}
                      className="rounded-full"
                    >
                      {model.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {dictionary.scenario.aspectRatioLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {VALID_ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio}
                    type="button"
                    size="sm"
                    variant={aspectRatio === ratio ? 'secondary' : 'outline'}
                    onClick={() => setAspectRatio(ratio)}
                    className="rounded-full"
                  >
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-11 w-full rounded-full"
            >
              {isSubmitting
                ? dictionary.scenario.generatingButton
                : dictionary.scenario.generateButton}
            </Button>
          </form>
        </CardContent>
      </Card>

      <GenerationResultStrip
        jobs={jobs}
        error={error}
        isStreaming={isStreaming}
        onClearFinished={clearFinishedJobs}
      />
    </div>
  )
}
