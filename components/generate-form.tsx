'use client'

import { useRef, useState } from 'react'
import { Wand2, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/components/locale-provider'
import { getScenario } from '@/lib/scenarios'
import { showQuotaError } from '@/lib/error-toast'
import { useGenerateStream } from '@/hooks/use-generate-stream'
import { PostActions } from '@/components/post-actions'
import { RefineDialog } from '@/components/refine-dialog'
import { getModelDefinition } from '@/lib/models/constants'
import type { ModelId } from '@/lib/models/types'

const DEFAULT_MODEL_ID: ModelId = 'gemini-3.1-flash'

const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const

interface GenerateFormProps {
  onBack?: () => void
  initialPrompt?: string
  initialAspectRatio?: string
}

export function GenerateForm({ onBack, initialPrompt, initialAspectRatio }: GenerateFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [prompt, setPrompt] = useState(initialPrompt ?? '')
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspectRatio ?? '16:9')
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(DEFAULT_MODEL_ID)
  const { locale, dictionary } = useLocale()
  const t = dictionary.generateForm
  const scenarioT = dictionary.scenario
  const freeformScenario = getScenario('freeform')

  const {
    status,
    result,
    error,
    isStreaming,
    startGeneration,
    cancelGeneration,
  } = useGenerateStream()

  const isPending = isStreaming

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!prompt.trim()) return
    startGeneration({
      prompt,
      aspectRatio: aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
      modelId: selectedModelId,
    })
  }

  function handleRetry() {
    if (!prompt.trim()) return
    startGeneration({
      prompt,
      aspectRatio: aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
      modelId: selectedModelId,
    })
  }

  function getErrorMessage() {
    if (!error) return null
    if (error.errorCode === 'quota_exceeded') {
      showQuotaError(locale, {
        dailyUsed: 0,
        dailyLimit: 0,
        monthlyUsed: 0,
        monthlyLimit: 0,
      })
      return null
    }
    return error.message
  }

  const errorMessage = getErrorMessage()
  const defaultModel = getModelDefinition(DEFAULT_MODEL_ID)

  return (
    <div className="space-y-6">
      {onBack && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            {scenarioT.backToScenarios}
          </Button>
          <span className="text-lg">{freeformScenario.icon} {scenarioT.freeform.name}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt">{t.promptLabel}</Label>
          <Textarea
            id="prompt"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create..."
            className="min-h-32 resize-none"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>{scenarioT.aspectRatioLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((ratio) => (
              <Button
                key={ratio}
                type="button"
                variant={aspectRatio === ratio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAspectRatio(ratio)}
                disabled={isPending}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t.modelLabel}</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedModelId === DEFAULT_MODEL_ID ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedModelId(DEFAULT_MODEL_ID)}
              disabled={isPending}
            >
              {defaultModel.label}
            </Button>
          </div>
        </div>

        <RefineDialog
          scenarioId="freeform"
          currentDescription={prompt}
          onApply={(refined) => setPrompt(refined)}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isPending || !prompt.trim()}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {scenarioT.generatingButton}
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              {scenarioT.generateButton}
            </>
          )}
        </Button>
      </form>

      {errorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.blobUrl} alt="Generated" className="w-full object-contain" />
          </div>
          <PostActions
            imageUrl={result.blobUrl}
            imageId={result.imageId}
            prompt={prompt}
            isUploadType={false}
            editIntent={freeformScenario.editIntent}
            onRetry={handleRetry}
            retrying={isPending}
          />
        </div>
      )}
    </div>
  )
}
