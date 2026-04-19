'use client'

import { useRef, useState, useTransition, useEffect, useCallback } from 'react'
import { Upload, X, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'
import { getScenario, buildPrompt, type ScenarioId } from '@/lib/scenarios'
import { generateImageAction } from '@/app/actions/generate'
import { editImageAction } from '@/app/actions/edit'
import { showQuotaError } from '@/lib/error-toast'
import { getImageActionErrorMessage } from '@/lib/image-action-error'
import { PostActions } from '@/components/post-actions'
import { RefineDialog } from '@/components/refine-dialog'
import { compressImage } from '@/lib/image-compress'
import type { ActionResult, ImageResult } from '@/lib/types'

interface ScenarioFormProps {
  scenarioId: ScenarioId
  onBack: () => void
}

interface UploadedFile {
  file: File
  preview: string
}

export function ScenarioForm({ scenarioId, onBack }: ScenarioFormProps) {
  const scenario = getScenario(scenarioId)
  const { locale, dictionary } = useLocale()
  const t = dictionary.scenario
  const uploadT = dictionary.editForm

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
  const [isCompressing, setIsCompressing] = useState(false)
  const [submitResult, setSubmitResult] = useState<ActionResult<ImageResult> | null>(null)

  // Get scenario-specific i18n. Each scenario key has at least { name, subtitle }.
  // Some have placeholder, styleLabel, extraLabel.
  const scenarioKey = scenarioId as keyof typeof t
  const scenarioI18n = t[scenarioKey] as Record<string, string>

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const currentCount = files.length
    const incoming = Array.from(newFiles)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 1 - currentCount)

    if (incoming.length === 0) return

    setIsCompressing(true)
    try {
      const compressed = await Promise.all(incoming.map((f) => compressImage(f)))
      const uploaded: UploadedFile[] = compressed.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setFiles((prev) => [...prev, ...uploaded].slice(0, 1))
    } finally {
      setIsCompressing(false)
    }
  }, [files.length])

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
      void addFiles(e.dataTransfer.files)
    }
  }

  function runSubmission() {
    const finalPrompt = buildPrompt(scenario, description, selectedStyle)
    const formData = new FormData()
    formData.set('prompt', finalPrompt)

    const timeoutError = {
      success: false as const,
      error:
        locale === 'zh'
          ? '请求超时或网络错误，请稍后重试'
          : 'Request timed out or network error. Please try again.',
    }

    setSubmitResult(null)

    if (scenario.inputType === 'upload') {
      if (files[0]) formData.set('image1', files[0].file)
      startTransition(async () => {
        try {
          const res = await editImageAction(formData)
          if (res.errorCode === 'quota_exceeded' && res.quota) {
            showQuotaError(locale, res.quota)
            return
          }
          setSubmitResult(res)
        } catch {
          setSubmitResult(timeoutError)
        }
      })
    } else {
      formData.set('aspectRatio', aspectRatio)
      formData.set('quality', quality)
      startTransition(async () => {
        try {
          const res = await generateImageAction(formData)
          if (res.errorCode === 'quota_exceeded' && res.quota) {
            showQuotaError(locale, res.quota)
            return
          }
          setSubmitResult(res)
        } catch {
          setSubmitResult(timeoutError)
        }
      })
    }
  }

  function handleSubmit() {
    runSubmission()
  }

  function handleRetry() {
    runSubmission()
  }

  function handleRefineApply(refined: string) {
    setDescription(refined)
  }

  const isUpload = scenario.inputType === 'upload'
  const canSubmit = isUpload
    ? files.length > 0 && (scenarioId === 'portrait' ? !!selectedStyle : true)
    : description.trim().length > 0

  const result = submitResult?.success ? submitResult.data : undefined
  const errorMessage =
    submitResult && !submitResult.success && submitResult.errorCode !== 'quota_exceeded'
      ? getImageActionErrorMessage(locale, submitResult.errorCode, submitResult.error)
      : null

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
              isCompressing ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {locale === 'zh' ? '正在压缩图片...' : 'Compressing image...'}
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t.uploadLabel}</p>
                  <p className="text-xs text-muted-foreground/70">{uploadT.dropzoneFormats}</p>
                </>
              )
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
                  aria-label={uploadT.removeImageAria.replace('{index}', '1')}
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
            onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = '' }}
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
      {errorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Submit */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={isPending || isCompressing || !canSubmit}
        onClick={handleSubmit}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t.generatingButton}
          </>
        ) : (
          t.generateButton
        )}
      </Button>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.blobUrl} alt="Generated" className="w-full object-contain" />
          </div>
          <PostActions
            imageUrl={result.blobUrl}
            imageId={result.imageId}
            prompt={buildPrompt(scenario, description, selectedStyle)}
            isUploadType={isUpload}
            editIntent={scenario.editIntent}
            onRetry={handleRetry}
            retrying={isPending}
          />
        </div>
      )}
    </div>
  )
}
