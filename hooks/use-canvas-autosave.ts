'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { saveCanvasStateAction } from '@/app/actions/canvas'
import {
  assertCanvasStateWithinLimit,
  type PersistedCanvasState,
} from '@/lib/canvas/state'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 800

export function useCanvasAutosave(
  canvasId: string,
  initialSerialized: string
) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()
  const latestSavedSerializedRef = useRef(initialSerialized)
  const pendingStateRef = useRef<PersistedCanvasState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flush the latest pending state to the server (used by beforeunload).
  const flushSync = useCallback(() => {
    const pending = pendingStateRef.current
    if (!pending) return

    try {
      const serialized = assertCanvasStateWithinLimit(pending)
      if (serialized === latestSavedSerializedRef.current) return

      // navigator.sendBeacon can't call server actions, so use fetch with keepalive.
      // This is a best-effort save — the page is closing, we can't await the result.
      const body = JSON.stringify({ canvasId, state: pending })
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/canvas/save`, body)
      } else {
        fetch(`/api/canvas/save`, { method: 'POST', body, keepalive: true })
      }
    } catch {
      // Best effort — page is closing, nothing we can do
    }
  }, [canvasId])

  useEffect(() => {
    const handleBeforeUnload = () => flushSync()
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [flushSync])

  const queueSave = useCallback(
    (nextState: PersistedCanvasState) => {
      // Store the latest state for beforeunload flush.
      // Do NOT serialize here — onChange fires on every mouse move during drag.
      pendingStateRef.current = nextState

      setStatus('saving')

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            // Size check happens here (after debounce), not on every onChange.
            const serialized = assertCanvasStateWithinLimit(nextState)

            if (serialized === latestSavedSerializedRef.current) {
              setStatus('saved')
              return
            }

            await saveCanvasStateAction(canvasId, nextState)
            latestSavedSerializedRef.current = serialized
            pendingStateRef.current = null
            setStatus('saved')
          } catch {
            setStatus('error')
          }
        })
      }, DEBOUNCE_MS)
    },
    [canvasId, startTransition]
  )

  return {
    isDirty: status === 'saving' || status === 'error',
    queueSave,
    status,
  }
}
