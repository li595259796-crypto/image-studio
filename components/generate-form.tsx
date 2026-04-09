'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { Wand2, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { generateImageAction } from '@/app/actions/generate'
import type { ActionResult } from '@/lib/types'

const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const qualities = ['1K', '2K', '4K'] as const

interface GenerateResult {
  imageUrl: string
  imageId: string
}

export function GenerateForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [aspectRatio, setAspectRatio] = useState<string>('16:9')
  const [quality, setQuality] = useState<string>('2K')
  const [result, setResult] = useState<ActionResult<GenerateResult> | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isPending) return
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isPending])

  async function handleDownload(url: string, filename: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }

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

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            name="prompt"
            placeholder="Describe the image you want to create..."
            className="min-h-32 resize-none"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
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
          <Label>Quality</Label>
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

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating... {elapsed}s
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              Generate
            </>
          )}
        </Button>
      </form>

      {result && !result.success && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {result?.success && result.data && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.data.imageUrl}
              alt="Generated image"
              className="w-full object-contain"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleDownload(result.data!.imageUrl, `generated-${result.data!.imageId}.png`)}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      )}
    </div>
  )
}
