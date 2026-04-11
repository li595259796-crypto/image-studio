'use client'

import { useRef, useState, useTransition } from 'react'
import { Wand2, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { getScenario } from '@/lib/scenarios'
import { generateImageAction } from '@/app/actions/generate'
import { showQuotaError } from '@/lib/error-toast'
import { getImageActionErrorMessage } from '@/lib/image-action-error'
import { PostActions } from '@/components/post-actions'
import { RefineDialog } from '@/components/refine-dialog'
import type { ActionResult, ImageResult } from '@/lib/types'

const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const qualities = ['1K', '2K', '4K'] as const

interface GenerateFormProps {
  onBack?: () => void
  initialPrompt?: string
  initialAspectRatio?: string
  initialQuality?: string
}

export function GenerateForm({ onBack, initialPrompt, initialAspectRatio, initialQuality }: GenerateFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [prompt, setPrompt] = useState(initialPrompt ?? '')
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspectRatio ?? '16:9')
  const [quality, setQuality] = useState<string>(initialQuality ?? '2K')
  const [submitResult, setSubmitResult] = useState<ActionResult<ImageResult> | null>(null)
  const { locale } = useLocale()
  const t = copy[locale].scenario
  const freeformScenario = getScenario('freeform')

  function runGeneration(formData: FormData) {
    setSubmitResult(null)
    startTransition(async () => {
      try {
        const res = await generateImageAction(formData)
        if (res.errorCode === 'quota_exceeded' && res.quota) {
          showQuotaError(locale, res.quota)
          return
        }
        setSubmitResult(res)
      } catch {
        setSubmitResult({
          success: false,
          error: locale === 'zh'
            ? '请求超时或网络错误，请稍后重试'
            : 'Request timed out or network error. Please try again.',
        })
      }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('aspectRatio', aspectRatio)
    formData.set('quality', quality)
    runGeneration(formData)
  }

  function handleRetry() {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    formData.set('aspectRatio', aspectRatio)
    formData.set('quality', quality)
    runGeneration(formData)
  }

  const result = submitResult?.success ? submitResult.data : undefined
  const errorMessage =
    submitResult && !submitResult.success && submitResult.errorCode !== 'quota_exceeded'
      ? getImageActionErrorMessage(locale, submitResult.errorCode, submitResult.error)
      : null

  return (
    <div className="space-y-6">
      {onBack && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            {t.backToScenarios}
          </Button>
          <span className="text-lg">{freeformScenario.icon} {t.freeform.name}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
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
          <Label>{t.aspectRatioLabel}</Label>
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
          <Label>{t.qualityLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {qualities.map((q) => (
              <Button
                key={q}
                type="button"
                variant={quality === q ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuality(q)}
                disabled={isPending}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>

        <RefineDialog
          scenarioId="freeform"
          currentDescription={prompt}
          onApply={(refined) => setPrompt(refined)}
        />

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t.generatingButton}
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              {t.generateButton}
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
