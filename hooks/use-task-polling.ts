'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

export function useTaskPolling(taskId: string | null): UseTaskPollingReturn {
  const [data, setData] = useState<TaskStatusResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    if (!taskId) return
    const res = await getTaskStatus(taskId)
    if (res.success && res.data) {
      setData(res.data)
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        setIsPolling(false)
      }
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId) {
      setIsPolling(false)
      setData(null)
      setElapsed(0)
      return
    }

    setIsPolling(true)
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
    if (!isPolling && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isPolling])

  useEffect(() => {
    if (!data?.createdAt || data.status === 'completed' || data.status === 'failed') {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      return
    }

    const createdAtMs = new Date(data.createdAt).getTime()

    function tick() {
      setElapsed(Math.floor((Date.now() - createdAtMs) / 1000))
    }

    tick()
    elapsedRef.current = setInterval(tick, 1000)

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [data?.createdAt, data?.status])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && isPolling) {
        void poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isPolling, poll])

  return {
    status: data?.status ?? null,
    result: data?.result,
    error: data?.error,
    attempts: data?.attempts ?? 0,
    maxAttempts: data?.maxAttempts ?? 3,
    elapsed,
    isPolling,
  }
}
