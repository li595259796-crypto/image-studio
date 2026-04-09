'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { Wand2, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { getScenario } from '@/lib/scenarios'
import { generateImageAction } from '@/app/actions/generate'
import { PostActions } from '@/components/post-actions'
import { RefineDialog } from '@/components/refine-dialog'
import type { ActionResult } from '@/lib/types'

const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const qualities = ['1K', '2K', '4K'] as const

interface GenerateResult {
  imageUrl: string
  imageId: string
}

interface GenerateFormProps {
  onBack?: () => void
}

export function GenerateForm({ onBack }: GenerateFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<string>('16:9')
  const [quality, setQuality] = useState<string>('2K')
  const [result, setResult] = useState<ActionResult<GenerateResult> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const { locale } = useLocale()
  const t = copy[locale].scenario
  const freeformScenario = getScenario('freeform')

  useEffect(() => {
    if (!isPending) return
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isPending])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setElapsed(0)
    const formData = new FormData(e.currentTarget)
    formData.set('aspectRatio', aspectRatio)
    formData.set('quality', quality)

    startTransition(async () => {
      const res = await generateImageAction(formData)
      setResult(res)
    })
  }

  function handleRetry() {
    setResult(null)
    setElapsed(0)
    const formData = new FormData()
    formData.set('prompt', prompt)
    formData.set('aspectRatio', aspectRatio)
    formData.set('quality', quality)

    startTransition(async () => {
      const res = await generateImageAction(formData)
      setResult(res)
    })
  }

  // --- Result view ---
  if (result?.success && result.data) {
    return (
      <div className="space-y-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            {t.backToScenarios}
          </Button>
        )}
        <div className="overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.data.imageUrl} alt="Generated image" className="w-full object-contain" />
        </div>
        <PostActions
          imageUrl={result.data.imageUrl}
          imageId={result.data.imageId}
          prompt={prompt}
          isUploadType={false}
          editIntent={freeformScenario.editIntent}
          onRetry={handleRetry}
          retrying={isPending}
        />
      </div>
    )
  }

  // --- Form view ---
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
              {t.generatingButton} {elapsed}s
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              {t.generateButton}
            </>
          )}
        </Button>
      </form>

      {result && !result.success && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}
    </div>
  )
}
