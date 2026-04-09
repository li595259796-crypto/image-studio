'use client'

import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PostActions } from '@/components/post-actions'
import { useLocale } from '@/components/locale-provider'

interface TaskStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: { imageId: string; blobUrl: string }
  error?: string
  elapsed: number
  attempts: number
  maxAttempts: number
  prompt: string
  isUploadType: boolean
  editIntent: string
  onRetry: () => void
  retrying?: boolean
}

export function TaskStatus({
  status,
  result,
  error,
  elapsed,
  attempts,
  prompt,
  isUploadType,
  editIntent,
  onRetry,
  retrying,
}: TaskStatusProps) {
  const { locale } = useLocale()

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/50 p-8 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {locale === 'zh' ? '排队中...' : 'Queued...'}
        </p>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/50 p-8 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">
          {locale === 'zh' ? `生成中... ${elapsed}s` : `Generating... ${elapsed}s`}
        </p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              {locale === 'zh' ? '生成失败' : 'Generation failed'}
            </p>
            {error && (
              <p className="text-xs text-destructive/80">{error}</p>
            )}
            {attempts > 0 && (
              <p className="text-xs text-muted-foreground">
                {locale === 'zh'
                  ? `已自动重试 ${attempts} 次`
                  : `Auto-retried ${attempts} time${attempts > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw className="size-3.5" />
          {locale === 'zh' ? '重试' : 'Retry'}
        </Button>
      </div>
    )
  }

  if (status === 'completed' && result) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.blobUrl} alt="Generated" className="w-full object-contain" />
        </div>
        <PostActions
          imageUrl={result.blobUrl}
          imageId={result.imageId}
          prompt={prompt}
          isUploadType={isUploadType}
          editIntent={editIntent}
          onRetry={onRetry}
          retrying={retrying}
        />
      </div>
    )
  }

  return null
}
