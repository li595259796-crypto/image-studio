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
import { PostActions } from '@/components/post-actions'
import { getPreloadableSourceUrl } from '@/lib/edit-source'
import type { ActionResult } from '@/lib/types'

interface EditResult {
  imageUrl: string
  imageId: string
}

interface UploadedFile {
  file: File
  preview: string
}

export function EditForm() {
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [result, setResult] = useState<ActionResult<EditResult> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreloadingSource, setIsPreloadingSource] = useState(false)
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const urlPrompt = searchParams.get('prompt')
    if (urlPrompt && !prompt) {
      setPrompt(urlPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
      // Only revoke on unmount, not on every files change
      files.forEach((f) => URL.revokeObjectURL(f.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = useCallback(
    (newFiles: FileList | File[], options?: { onlyIfEmpty?: boolean }) => {
      setFiles((prev) => {
        if (options?.onlyIfEmpty && prev.length > 0) {
          return prev
        }

        const incoming = Array.from(newFiles)
          .filter((f) => f.type.startsWith('image/'))
          .slice(0, 2 - prev.length)

        if (incoming.length === 0) return prev

        const uploaded: UploadedFile[] = incoming.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }))

        return [...prev, ...uploaded].slice(0, 2)
      })
    },
    []
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

        addFiles([file], { onlyIfEmpty: true })
      } catch {
        toast.error('无法加载源图片，请手动上传')
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
  }, [addFiles, searchParams])

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
      addFiles(e.dataTransfer.files)
    }
  }

  function handleRetry() {
    setResult(null)
    setElapsed(0)
    const formData = new FormData()
    formData.set('prompt', prompt)
    if (files[0]) formData.set('image1', files[0].file)
    if (files[1]) formData.set('image2', files[1].file)

    startTransition(async () => {
      const res = await editImageAction(formData)
      if (res.errorCode === 'quota_exceeded' && res.quota) {
        showQuotaError(locale, res.quota)
        return
      }
      setResult(res)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setElapsed(0)
    const formData = new FormData(e.currentTarget)

    if (files[0]) {
      formData.set('image1', files[0].file)
    }
    if (files[1]) {
      formData.set('image2', files[1].file)
    }

    startTransition(async () => {
      const res = await editImageAction(formData)
      if (res.errorCode === 'quota_exceeded' && res.quota) {
        showQuotaError(locale, res.quota)
        return
      }
      setResult(res)
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Images (1-2)</Label>
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
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop images here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PNG, JPG, WebP up to 10MB
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
                      aria-label={`Remove image ${i + 1}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(i)
                      }}
                      className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3" />
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
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-prompt">Editing Prompt</Label>
          <Textarea
            id="edit-prompt"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the edits you want to make..."
            className="min-h-28 resize-none"
            required
            disabled={isPending}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isPending || files.length === 0}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Editing... {elapsed}s
            </>
          ) : (
            <>
              <ImagePlus className="size-4" />
              Edit
            </>
          )}
        </Button>
      </form>

      {result && !result.success && result.errorCode !== 'quota_exceeded' && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {result?.success && result.data && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.data.imageUrl} alt="Edited image" className="w-full object-contain" />
          </div>
          <PostActions
            imageUrl={result.data.imageUrl}
            imageId={result.data.imageId}
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
