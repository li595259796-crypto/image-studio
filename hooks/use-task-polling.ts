// FROZEN (P4 async rollback): polling hook kept for future re-activation.
// No live component uses this after the sync rollback on 2026-04-10.
'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { getTaskStatus } from '@/app/actions/tasks'
import type { TaskStatusResult } from '@/lib/types'

const POLL_INTERVAL_MS = 3000

interface UseTaskPollingReturn {
  status: TaskStatusResult['status'] | null
  result?: { imageId: string; blobUrl: string }
  error?: string
  attempts: number
  maxAttempts: number
  elapsed: number
  isPolling: boolean
}

interface PollState {
  taskId: string | null
  data: TaskStatusResult | null
  elapsed: number
}

type PollAction =
  | { type: 'reset'; taskId: string | null }
  | { type: 'setData'; taskId: string; data: TaskStatusResult }
  | { type: 'setElapsed'; elapsed: number }

function createInitialState(taskId: string | null): PollState {
  return {
    taskId,
    data: null,
    elapsed: 0,
  }
}

function pollReducer(state: PollState, action: PollAction): PollState {
  switch (action.type) {
    case 'reset':
      return createInitialState(action.taskId)
    case 'setData':
      return action.taskId === state.taskId
        ? { ...state, data: action.data }
        : state
    case 'setElapsed':
      return { ...state, elapsed: action.elapsed }
    default:
      return state
  }
}

export function useTaskPolling(taskId: string | null): UseTaskPollingReturn {
  const [state, dispatch] = useReducer(pollReducer, taskId, createInitialState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeTaskIdRef = useRef<string | null>(taskId)

  const poll = useCallback(async () => {
    if (!taskId) return

    const requestedTaskId = taskId
    const res = await getTaskStatus(requestedTaskId)

    if (activeTaskIdRef.current !== requestedTaskId) {
      return
    }

    if (res.success && res.data) {
      dispatch({ type: 'setData', taskId: requestedTaskId, data: res.data })
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [taskId])

  useEffect(() => {
    activeTaskIdRef.current = taskId
    dispatch({ type: 'reset', taskId })

    if (!taskId) {
      return
    }

    void poll()

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [taskId, poll])

  useEffect(() => {
    const hasTerminalStatus =
      state.taskId === taskId &&
      (state.data?.status === 'completed' || state.data?.status === 'failed')

    if ((!taskId || hasTerminalStatus) && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [state.data?.status, state.taskId, taskId])

  useEffect(() => {
    if (
      state.taskId !== taskId ||
      !state.data?.createdAt ||
      state.data.status === 'completed' ||
      state.data.status === 'failed'
    ) {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      return
    }

    const createdAtMs = new Date(state.data.createdAt).getTime()

    function tick() {
      dispatch({ type: 'setElapsed', elapsed: Math.floor((Date.now() - createdAtMs) / 1000) })
    }

    tick()
    elapsedRef.current = setInterval(tick, 1000)

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [state.data?.createdAt, state.data?.status, state.taskId, taskId])

  useEffect(() => {
    function handleVisibility() {
      if (
        document.visibilityState === 'visible' &&
        taskId &&
        (state.taskId !== taskId ||
          (state.data?.status !== 'completed' && state.data?.status !== 'failed'))
      ) {
        void poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [poll, state.data?.status, state.taskId, taskId])

  const currentData = state.taskId === taskId ? state.data : null
  const isPolling =
    Boolean(taskId) &&
    (state.taskId !== taskId ||
      (currentData?.status !== 'completed' && currentData?.status !== 'failed'))

  return {
    status: currentData?.status ?? null,
    result: currentData?.result,
    error: currentData?.error,
    attempts: currentData?.attempts ?? 0,
    maxAttempts: currentData?.maxAttempts ?? 3,
    elapsed: state.taskId === taskId ? state.elapsed : 0,
    isPolling,
  }
}
