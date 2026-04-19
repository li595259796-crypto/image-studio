'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { parseSseMessages } from './use-canvas-generation-stream'
import { useLocale } from '@/components/locale-provider'
import { getImageActionErrorMessage } from '@/lib/image-action-error'

export type GenerateStreamStatus = 'idle' | 'processing' | 'completed' | 'failed'

export interface GenerateResult {
  imageId: string
  blobUrl: string
  durationMs: number
}

export interface GenerateError {
  errorCode: string
  message: string
  durationMs: number
}

export function useGenerateStream() {
  const [status, setStatus] = useState<GenerateStreamStatus>('idle')
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<GenerateError | null>(null)
  const { locale } = useLocale()
  const abortControllerRef = useRef<AbortController | null>(null)

  const startGeneration = useCallback(
    async ({
      prompt,
      aspectRatio,
      modelId,
      quality,
    }: {
      prompt: string
      aspectRatio: string
      modelId: string
      quality?: string
    }) => {
      setStatus('processing')
      setResult(null)
      setError(null)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId: undefined,
            prompt,
            aspectRatio,
            modelIds: [modelId],
            quality,
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          let message = 'Generation request failed'
          try {
            const payload = (await response.json()) as { error?: string }
            if (payload.error) {
              message = payload.error
            }
          } catch {}

          setError({ errorCode: 'request_failed', message, durationMs: 0 })
          setStatus('failed')
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let receivedTerminalEvent = false

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
              case 'job_completed':
                setResult({
                  imageId: message.data.imageId,
                  blobUrl: message.data.blobUrl,
                  durationMs: message.data.durationMs,
                })
                setStatus('completed')
                receivedTerminalEvent = true
                break
              case 'job_failed':
                setError({
                  errorCode: message.data.errorCode,
                  message: message.data.message,
                  durationMs: message.data.durationMs,
                })
                setStatus('failed')
                receivedTerminalEvent = true
                break
              case 'fatal':
                setError({
                  errorCode: 'fatal',
                  message: message.data.message,
                  durationMs: 0,
                })
                setStatus('failed')
                receivedTerminalEvent = true
                break
              case 'done':
              case 'started':
                // Ignored for single-job case
                break
            }
          }
        }

        // Stream ended without a terminal event → treat as failure
        if (!receivedTerminalEvent) {
          setError({
            errorCode: 'stream_closed_early',
            message: getImageActionErrorMessage(locale, 'stream_closed_early'),
            durationMs: 0,
          })
          setStatus('failed')
        }
      } catch (caughtError: unknown) {
        if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
          return
        }
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Generation request failed unexpectedly'
        setError({ errorCode: 'request_failed', message, durationMs: 0 })
        setStatus('failed')
      } finally {
        abortControllerRef.current = null
      }
    },
    [locale]
  )

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  return useMemo(
    () => ({
      status,
      result,
      error,
      isStreaming: status === 'processing',
      isSubmitting: status === 'processing',
      startGeneration,
      cancelGeneration,
    }),
    [status, result, error, startGeneration, cancelGeneration]
  )
}
