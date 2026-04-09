'use client'

import { useRef, useState, useTransition, useEffect, useCallback } from 'react'
import { Upload, X, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { getScenario, buildPrompt, type ScenarioId } from '@/lib/scenarios'
import { generateImageAction } from '@/app/actions/generate'
import { editImageAction } from '@/app/actions/edit'
import { showQuotaError } from '@/lib/error-toast'
import { PostActions } from '@/components/post-actions'
import { RefineDialog } from '@/components/refine-dialog'
import type { ActionResult } from '@/lib/types'

interface ScenarioFormProps {
  scenarioId: ScenarioId
  onBack: () => void
}

interface GenerateResult {
  imageUrl: string
  imageId: string
}

interface UploadedFile {
  file: File
  preview: string
}

export function ScenarioForm({ scenarioId, onBack }: ScenarioFormProps) {
  const scenario = getScenario(scenarioId)
  const { locale } = useLocale()
  const t = copy[locale].scenario

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string | undefined>(
    scenario.stylePresets?.[0]
  )
  const [aspectRatio, setAspectRatio] = useState(scenario.defaultAspectRatio)
  const [quality, setQuality] = useState(scenario.defaultQuality)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ActionResult<GenerateResult> | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Get scenario-specific i18n. Each scenario key has at least { name, subtitle }.
  // Some have placeholder, styleLabel, extraLabel.
  const scenarioKey = scenarioId as keyof typeof t
  const scenarioI18n = t[scenarioKey] as Record<string, string>

  useEffect(() => {
    if (!isPending) return
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isPending])

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setFiles((prev) => {
      const incoming = Array.from(newFiles)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, 1 - prev.length)
      if (incoming.length === 0) return prev
      const uploaded: UploadedFile[] = incoming.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      return [...prev, ...uploaded].slice(0, 1)
    })
  }, [])

  function removeFile() {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview))
      return []
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files)
    }
  }

  function handleSubmit() {
    setElapsed(0)
    const finalPrompt = buildPrompt(scenario, description, selectedStyle)
    const formData = new FormData()
    formData.set('prompt', finalPrompt)

    if (scenario.inputType === 'upload') {
      if (files[0]) formData.set('image1', files[0].file)
      startTransition(async () => {
        const res = await editImageAction(formData)
        if (res.errorCode === 'quota_exceeded' && res.quota) {
          showQuotaError(locale, res.quota)
          return
        }
        setResult(res)
      })
    } else {
      formData.set('aspectRatio', aspectRatio)
      formData.set('quality', quality)
      startTransition(async () => {
        const res = await generateImageAction(formData)
        if (res.errorCode === 'quota_exceeded' && res.quota) {
          showQuotaError(locale, res.quota)
          return
        }
        setResult(res)
      })
    }
  }

  function handleRetry() {
    setResult(null)
    handleSubmit()
  }

  function handleRefineApply(refined: string) {
    setDescription(refined)
  }

  const isUpload = scenario.inputType === 'upload'
  const canSubmit = isUpload
    ? files.length > 0 && (scenarioId === 'portrait' ? !!selectedStyle : true)
    : description.trim().length > 0

  // --- Result view ---
  if (result?.success && result.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          {t.backToScenarios}
        </Button>
        <div className="overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.data.imageUrl} alt="Generated" className="w-full object-contain" />
        </div>
        <PostActions
          imageUrl={result.data.imageUrl}
          imageId={result.data.imageId}
          prompt={buildPrompt(scenario, description, selectedStyle)}
          isUploadType={isUpload}
          editIntent={scenario.editIntent}
          onRetry={handleRetry}
          retrying={isPending}
        />
      </div>
    )
  }

  // --- Form view ---
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          {t.backToScenarios}
        </Button>
        <span className="text-lg">
          {scenario.icon} {scenarioI18n.name}
        </span>
      </div>

      {/* Upload zone (only for upload scenarios) */}
      {isUpload && (
        <div className="space-y-2">
          <Label>{t.uploadLabel}</Label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => files.length === 0 && fileInputRef.current?.click()}
            className={cn(
              'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              files.length > 0 && 'cursor-default'
            )}
          >
            {files.length === 0 ? (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t.uploadLabel}</p>
                <p className="text-xs text-muted-foreground/70">PNG, JPG, WebP up to 10MB</p>
              </>
            ) : (
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={files[0].preview}
                  alt="Upload"
                  className="size-28 rounded-lg object-cover ring-1 ring-border"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile() }}
                  className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Upload image"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {/* Style chips (only for portrait) */}
      {scenario.stylePresets && (
        <div className="space-y-2">
          <Label>{scenarioI18n.styleLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {scenario.stylePresets.map((style) => (
              <Button
                key={style}
                type="button"
                variant={selectedStyle === style ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStyle(style)}
              >
                {style}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Description textarea */}
      <div className="space-y-2">
        <Label>
          {scenario.stylePresets ? scenarioI18n.extraLabel : t.descriptionLabel}
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={scenarioI18n.placeholder ?? ''}
          className="min-h-28 resize-none"
          disabled={isPending}
        />
      </div>

      {/* Aspect ratio (only for text scenarios) */}
      {!isUpload && (
        <div className="space-y-2">
          <Label>{t.aspectRatioLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {scenario.aspectRatios.map((ratio) => (
              <Button
                key={ratio}
                type="button"
                variant={aspectRatio === ratio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAspectRatio(ratio)}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quality (only for text scenarios) */}
      {!isUpload && (
        <div className="space-y-2">
          <Label>{t.qualityLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {(['2K', '4K'] as const).map((q) => (
              <Button
                key={q}
                type="button"
                variant={quality === q ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuality(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Refine button */}
      <RefineDialog
        scenarioId={scenarioId}
        currentDescription={description}
        onApply={handleRefineApply}
      />

      {/* Error display */}
      {result && !result.success && result.errorCode !== 'quota_exceeded' && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {/* Submit */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={isPending || !canSubmit}
        onClick={handleSubmit}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t.generatingButton} {elapsed}s
          </>
        ) : (
          t.generateButton
        )}
      </Button>
    </div>
  )
}
