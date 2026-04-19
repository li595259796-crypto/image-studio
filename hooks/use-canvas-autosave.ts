'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { saveCanvasStateAction } from '@/app/actions/canvas'
import {
  assertCanvasStateWithinLimit,
  type PersistedCanvasState,
  type SaveStatus,
} from '@/lib/canvas/state'
import { shouldFlipToSaving } from './use-canvas-autosave-gate'

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
  const inFlightRef = useRef(false)
  const dirtyRef = useRef(false)

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
      pendingStateRef.current = nextState
      dirtyRef.current = true

      // Only flip the visible status when transitioning from a non-saving state.
      // Previously setStatus('saving') fired on every pointer-move during drag,
      // causing unnecessary re-renders AND the badge to look stuck because the
      // debounced save didn't visibly transition it back to 'saved'.
      if (shouldFlipToSaving(inFlightRef.current)) {
        setStatus('saving')
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        startTransition(async () => {
          inFlightRef.current = true
          try {
            const serialized = assertCanvasStateWithinLimit(nextState)

            if (serialized === latestSavedSerializedRef.current) {
              dirtyRef.current = false
              setStatus('saved')
              return
            }

            await saveCanvasStateAction(canvasId, nextState)
            latestSavedSerializedRef.current = serialized
            pendingStateRef.current = null
            dirtyRef.current = false
            setStatus('saved')
          } catch {
            setStatus('error')
          } finally {
            inFlightRef.current = false
            // If more changes arrived while we were saving, kick off another round.
            if (dirtyRef.current && pendingStateRef.current) {
              const followUpSnapshot = pendingStateRef.current
              setStatus('saving')
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
              timeoutRef.current = setTimeout(() => {
                void saveCanvasStateAction(canvasId, followUpSnapshot)
                  .then(() => {
                    dirtyRef.current = false
                    setStatus('saved')
                  })
                  .catch(() => setStatus('error'))
              }, DEBOUNCE_MS)
            }
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
