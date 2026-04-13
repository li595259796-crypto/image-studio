'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { getModelDefinition } from '../lib/models/constants.ts'
import type {
  ModelId,
  ModelProvider,
} from '../lib/models/types.ts'

export type GenerationStreamEvent =
  | {
      event: 'started'
      data: {
        groupId: string
        jobs: Array<{
          jobId: string
          modelId: ModelId
          provider: ModelProvider
        }>
      }
    }
  | {
      event: 'job_completed'
      data: {
        jobId: string
        modelId: ModelId
        provider: ModelProvider
        imageId: string
        blobUrl: string
        durationMs: number
      }
    }
  | {
      event: 'job_failed'
      data: {
        jobId: string
        modelId: ModelId
        errorCode: string
        message: string
        durationMs: number
      }
    }
  | {
      event: 'done'
      data: {
        groupId: string
      }
    }
  | {
      event: 'fatal'
      data: {
        message: string
      }
    }

export interface GenerationClientJob {
  localRunId: string
  groupId?: string
  placeholderKey: string
  jobId: string
  modelId: ModelId
  modelLabel: string
  provider: ModelProvider
  prompt: string
  aspectRatio: string
  status: 'processing' | 'completed' | 'failed'
  durationMs?: number
  errorCode?: string
  message?: string
  imageId?: string
  blobUrl?: string
}

export interface StartGenerationInput {
  canvasId: string
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  modelIds: ModelId[]
  onStart?: (
    items: Array<{
      modelId: ModelId
      modelLabel: string
      index: number
      placeholderKey: string
    }>
  ) => void
  onCompleted?: (job: GenerationClientJob) => void | Promise<void>
  onFailed?: (job: GenerationClientJob) => void | Promise<void>
}

export function parseSseMessages(input: string): {
  events: GenerationStreamEvent[]
  remainder: string
} {
  const chunks = input.split('\n\n')
  const remainder = chunks.pop() ?? ''
  const events: GenerationStreamEvent[] = []

  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    const eventLine = lines.find((line) => line.startsWith('event: '))
    const dataLines = lines.filter((line) => line.startsWith('data: '))

    if (!eventLine || dataLines.length === 0) {
      continue
    }

    try {
      const event = eventLine.slice('event: '.length) as GenerationStreamEvent['event']
      const data = JSON.parse(
        dataLines.map((line) => line.slice('data: '.length)).join('\n')
      ) as GenerationStreamEvent['data']

      events.push({ event, data } as GenerationStreamEvent)
    } catch {
      // Ignore malformed chunks so a single bad event does not poison the stream.
    }
  }

  return { events, remainder }
}

function makeOptimisticJobId(localRunId: string, modelId: ModelId): string {
  return `temp:${localRunId}:${modelId}`
}

export function useCanvasGenerationStream() {
  const [jobs, setJobs] = useState<GenerationClientJob[]>([])
  const [activeRunCount, setActiveRunCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const jobsRef = useRef<GenerationClientJob[]>([])

  const updateJobs = useCallback(
    (updater: (current: GenerationClientJob[]) => GenerationClientJob[]) => {
      setJobs((current) => {
        const next = updater(current)
        jobsRef.current = next
        return next
      })
    },
    []
  )

  const failLocalRun = useCallback(
    async (
      localRunId: string,
      message: string,
      onFailed?: StartGenerationInput['onFailed']
    ) => {
      const failedJobs: GenerationClientJob[] = []

      updateJobs((current) =>
        current.map((job) => {
          if (job.localRunId !== localRunId || job.status !== 'processing') {
            return job
          }

          const failed = {
            ...job,
            status: 'failed' as const,
            message,
            errorCode: job.errorCode ?? 'provider_error',
          }
          failedJobs.push(failed)
          return failed
        })
      )

      if (onFailed) {
        for (const failedJob of failedJobs) {
          await onFailed(failedJob)
        }
      }
    },
    [updateJobs]
  )

  const startGeneration = useCallback(
    async ({
      canvasId,
      prompt,
      aspectRatio,
      modelIds,
      onStart,
      onCompleted,
      onFailed,
    }: StartGenerationInput) => {
      const localRunId = crypto.randomUUID()
      const startIndex = jobsRef.current.length
      const optimisticJobs = modelIds.map((modelId) => {
        const definition = getModelDefinition(modelId)

        return {
          localRunId,
          placeholderKey: makeOptimisticJobId(localRunId, modelId),
          jobId: makeOptimisticJobId(localRunId, modelId),
          modelId,
          modelLabel: definition.label,
          provider: definition.provider,
          prompt,
          aspectRatio,
          status: 'processing' as const,
        }
      })

      setError(null)
      updateJobs((current) => [...current, ...optimisticJobs])
      onStart?.(
        optimisticJobs.map((job, index) => ({
          modelId: job.modelId,
          modelLabel: job.modelLabel,
          index: startIndex + index,
          placeholderKey: job.placeholderKey,
        }))
      )

      setActiveRunCount((count) => count + 1)

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId,
            prompt,
            aspectRatio,
            modelIds,
          }),
        })

        if (!response.ok || !response.body) {
          let message = 'Generation request failed'
          try {
            const payload = (await response.json()) as { error?: string }
            if (payload.error) {
              message = payload.error
            }
          } catch {}

          setError(message)
          await failLocalRun(localRunId, message, onFailed)
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const parsed = parseSseMessages(buffer)
          buffer = parsed.remainder

          for (const message of parsed.events) {
            switch (message.event) {
              case 'started':
                updateJobs((current) =>
                  current.map((job) => {
                    if (
                      job.localRunId !== localRunId ||
                      !job.jobId.startsWith(`temp:${localRunId}:`)
                    ) {
                      return job
                    }

                    const serverJob = message.data.jobs.find(
                      (candidate) => candidate.modelId === job.modelId
                    )

                    if (!serverJob) {
                      return job
                    }

                    return {
                      ...job,
                      groupId: message.data.groupId,
                      jobId: serverJob.jobId,
                      provider: serverJob.provider,
                    }
                  })
                )
                break
              case 'job_completed': {
                let completedJob: GenerationClientJob | null = null

                updateJobs((current) =>
                  current.map((job) => {
                    const matchesJobId = job.jobId === message.data.jobId
                    const matchesOptimisticId =
                      job.localRunId === localRunId &&
                      job.placeholderKey ===
                        makeOptimisticJobId(localRunId, message.data.modelId)

                    if (!matchesJobId && !matchesOptimisticId) {
                      return job
                    }

                    completedJob = {
                      ...job,
                      jobId: message.data.jobId,
                      modelId: message.data.modelId,
                      provider: message.data.provider,
                      status: 'completed',
                      imageId: message.data.imageId,
                      blobUrl: message.data.blobUrl,
                      durationMs: message.data.durationMs,
                    }
                    return completedJob
                  })
                )

                if (completedJob && onCompleted) {
                  await onCompleted(completedJob)
                }
                break
              }
              case 'job_failed': {
                let failedJob: GenerationClientJob | null = null

                updateJobs((current) =>
                  current.map((job) => {
                    const matchesJobId = job.jobId === message.data.jobId
                    const matchesOptimisticId =
                      job.localRunId === localRunId &&
                      job.placeholderKey ===
                        makeOptimisticJobId(localRunId, message.data.modelId)

                    if (!matchesJobId && !matchesOptimisticId) {
                      return job
                    }

                    failedJob = {
                      ...job,
                      jobId: message.data.jobId,
                      status: 'failed',
                      errorCode: message.data.errorCode,
                      message: message.data.message,
                      durationMs: message.data.durationMs,
                    }
                    return failedJob
                  })
                )

                if (failedJob && onFailed) {
                  await onFailed(failedJob)
                }
                break
              }
              case 'fatal':
                setError(message.data.message)
                await failLocalRun(localRunId, message.data.message, onFailed)
                break
              case 'done':
                break
            }
          }
        }
      } catch (caughtError: unknown) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Generation request failed unexpectedly'
        setError(message)
        await failLocalRun(localRunId, message, onFailed)
      } finally {
        setActiveRunCount((count) => Math.max(0, count - 1))
      }
    },
    [failLocalRun, updateJobs]
  )

  const clearFinishedJobs = useCallback(() => {
    updateJobs((current) => current.filter((job) => job.status === 'processing'))
  }, [updateJobs])

  return useMemo(
    () => ({
      jobs,
      error,
      isStreaming: activeRunCount > 0,
      isSubmitting: activeRunCount > 0,
      clearFinishedJobs,
      startGeneration,
    }),
    [activeRunCount, clearFinishedJobs, error, jobs, startGeneration]
  )
}
