'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/locale-provider'
import { cn } from '@/lib/utils'
import type { GenerationClientJob } from '@/hooks/use-canvas-generation-stream'

function getJobBadgeVariant(status: GenerationClientJob['status']) {
  switch (status) {
    case 'completed':
      return 'secondary' as const
    case 'failed':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

export function GenerationResultStrip({
  jobs,
  isStreaming,
  error,
  onClearFinished,
  className,
}: {
  jobs: GenerationClientJob[]
  isStreaming: boolean
  error: string | null
  onClearFinished: () => void
  className?: string
}) {
  const { dictionary } = useLocale()
  const hasFinishedJobs = jobs.some((job) => job.status !== 'processing')

  function getStatusLabel(status: GenerationClientJob['status']) {
    switch (status) {
      case 'completed':
        return dictionary.canvas.statusCompleted
      case 'failed':
        return dictionary.canvas.statusFailed
      default:
        return dictionary.canvas.statusGenerating
    }
  }

  return (
    <Card size="sm" className={cn('border-border/70', className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{dictionary.canvas.jobsLabel}</CardTitle>
            <CardDescription>
              {isStreaming
                ? `${jobs.filter((job) => job.status === 'processing').length} ${dictionary.canvas.statusGenerating}`
                : dictionary.canvas.panelDescription}
            </CardDescription>
          </div>
          {hasFinishedJobs ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={onClearFinished}
              className="rounded-full"
            >
              {dictionary.canvas.clearFinished}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {dictionary.canvas.panelDescription}
          </p>
        ) : (
          jobs
            .slice()
            .reverse()
            .map((job) => (
              <div
                key={job.placeholderKey}
                className="rounded-2xl border border-border/70 bg-panel/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {job.modelLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.aspectRatio}
                      {job.durationMs ? ` · ${job.durationMs}ms` : ''}
                    </p>
                  </div>
                  <Badge variant={getJobBadgeVariant(job.status)}>
                    {getStatusLabel(job.status)}
                  </Badge>
                </div>
                {job.message ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {job.message}
                  </p>
                ) : null}
                {job.blobUrl ? (
                  <a
                    href={job.blobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {job.imageId}
                  </a>
                ) : null}
              </div>
            ))
        )}
        {error ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
