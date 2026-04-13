'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { saveCanvasStateAction } from '@/app/actions/canvas'
import {
  assertCanvasStateWithinLimit,
  type PersistedCanvasState,
} from '@/lib/canvas/state'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCanvasAutosave(
  canvasId: string,
  initialState: PersistedCanvasState,
  initialSerialized = assertCanvasStateWithinLimit(initialState)
) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [isPending, startTransition] = useTransition()
  const latestSavedSerializedRef = useRef(initialSerialized)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function queueSave(nextState: PersistedCanvasState) {
    const serialized = assertCanvasStateWithinLimit(nextState)

    if (serialized === latestSavedSerializedRef.current) {
      if (status !== 'saved') {
        setStatus('idle')
      }
      return
    }

    setStatus('saving')

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveCanvasStateAction(canvasId, nextState)
          latestSavedSerializedRef.current = serialized
          setStatus('saved')
        } catch {
          setStatus('error')
        }
      })
    }, 800)
  }

  return {
    isPending,
    isDirty: status === 'saving' || status === 'error',
    queueSave,
    status,
  }
}
