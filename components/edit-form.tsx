'use client'

import { useRef, useState, useTransition, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { ImagePlus, X, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { editImageAction } from '@/app/actions/edit'
import { useLocale } from '@/components/locale-provider'
import { showQuotaError } from '@/lib/error-toast'
import { getImageActionErrorMessage } from '@/lib/image-action-error'
import { PostActions } from '@/components/post-actions'
import { getPreloadableSourceUrl } from '@/lib/edit-source'
import { compressImage } from '@/lib/image-compress'
import type { ActionResult, ImageResult } from '@/lib/types'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'

interface UploadedFile {
  file: File
  preview: string
}

export function EditForm() {
  const searchParams = useSearchParams()
  const { locale, dictionary } = useLocale()
  const t = dictionary.editForm
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [submitResult, setSubmitResult] = useState<ActionResult<ImageResult> | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreloadingSource, setIsPreloadingSource] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [prompt, setPrompt] = useState(() => searchParams.get('prompt') ?? '')

  useUnsavedChangesWarning({
    hasFiles: files.length > 0,
    wasSubmitted: submitResult?.success === true,
  })

  const filesRef = useRef(files)
  // Keep the ref pointing at the latest files on every render. Direct
  // assignment (permitted by React) avoids the narrow stale-ref window
  // that the useEffect-based pattern has on same-cycle unmounts.
  filesRef.current = files

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview))
    }
  }, [])

  const addFiles = useCallback(
    async (newFiles: FileList | File[], options?: { onlyIfEmpty?: boolean }) => {
      // Snapshot current files length for slot calculation (React 19 setState callback
      // cannot be async, so we compute outside the setter).
      const currentCount = files.length
      if (options?.onlyIfEmpty && currentCount > 0) return

      const incoming = Array.from(newFiles)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, 2 - currentCount)

      if (incoming.length === 0) return

      setIsCompressing(true)
      try {
        const compressed = await Promise.all(incoming.map((f) => compressImage(f)))
        const uploaded: UploadedFile[] = compressed.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }))
        setFiles((prev) => [...prev, ...uploaded].slice(0, 2))
      } finally {
        setIsCompressing(false)
      }
    },
    [files.length]
  )

  const preloadAttemptedRef = useRef(false)

  useEffect(() => {
    const sourceUrl = getPreloadableSourceUrl(searchParams.get('sourceUrl'), files.length)

    if (!sourceUrl || preloadAttemptedRef.current) {
      return
    }

    preloadAttemptedRef.current = true
    const preloadSourceUrl = sourceUrl
    let cancelled = false

    async function loadSource() {
      setIsPreloadingSource(true)

      try {
        const response = await fetch(preloadSourceUrl)

        if (!response.ok) {
          throw new Error('Failed to fetch source image')
        }

        const blob = await response.blob()

        if (cancelled) {
          return
        }

        const file = new File([blob], 'source.png', {
          type: blob.type || 'image/png',
        })

        await addFiles([file], { onlyIfEmpty: true })
      } catch {
        toast.error(t.loadSourceFailed)
      } finally {
        if (!cancelled) {
          setIsPreloadingSource(false)
        }
      }
    }

    void loadSource()

    return () => {
      cancelled = true
    }
  }, [addFiles, files.length, searchParams])

  function removeFile(index: number) {
    setFiles((prev) => {
      const copy = [...prev]
      URL.revokeObjectURL(copy[index].preview)
      copy.splice(index, 1)
      return copy
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      void addFiles(e.dataTransfer.files)
    }
  }

  function runEdit(formData: FormData) {
    setSubmitResult(null)
    startTransition(async () => {
      try {
        const res = await editImageAction(formData)
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

    if (files[0]) {
      formData.set('image1', files[0].file)
    }
    if (files[1]) {
      formData.set('image2', files[1].file)
    }

    runEdit(formData)
  }

  function handleRetry() {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    if (files[0]) formData.set('image1', files[0].file)
    if (files[1]) formData.set('image2', files[1].file)
    runEdit(formData)
  }

  const result = submitResult?.success ? submitResult.data : undefined
  const errorMessage =
    submitResult && !submitResult.success && submitResult.errorCode !== 'quota_exceeded'
      ? getImageActionErrorMessage(locale, submitResult.errorCode, submitResult.error)
      : null

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>{t.imagesLabel}</Label>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => files.length < 2 && fileInputRef.current?.click()}
            className={cn(
              'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              files.length >= 2 && 'cursor-default'
            )}
          >
            {files.length === 0 ? (
              isPreloadingSource ? (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading source image...</p>
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
              ) : isCompressing ? (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {locale === 'zh' ? '正在压缩图片...' : 'Compressing image...'}
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t.dropzoneHint}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {t.dropzoneFormats}
                  </p>
                </>
              )
            ) : (
              <div className="flex gap-4">
                {files.map((f, i) => (
                  <div key={f.preview} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.preview}
                      alt={`Upload ${i + 1}`}
                      className="size-28 rounded-lg object-cover ring-1 ring-border"
                    />
                    <button
                      type="button"
                      aria-label={t.removeImageAria.replace('{index}', String(i + 1))}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(i)
                      }}
                      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground shadow-sm transition-opacity hover:bg-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                {files.length < 2 && (
                  <div className="flex size-28 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                    <ImagePlus className="size-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="Upload images"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-prompt">{t.promptLabel}</Label>
          <Textarea
            id="edit-prompt"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.promptPlaceholder}
            className="min-h-28 resize-none"
            required
            disabled={isPending}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isPending || isCompressing || files.length === 0}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t.submittingButton}
            </>
          ) : (
            <>
              <ImagePlus className="size-4" />
              {t.submitButton}
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
            <img src={result.blobUrl} alt="Edited" className="w-full object-contain" />
          </div>
          <PostActions
            imageUrl={result.blobUrl}
            imageId={result.imageId}
            prompt={prompt}
            isUploadType={true}
            editIntent="保留主体，优化背景和光线"
            onRetry={handleRetry}
            retrying={isPending}
          />
        </div>
      )}
    </div>
  )
}
