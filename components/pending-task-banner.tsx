'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getRecentPendingTask } from '@/app/actions/tasks'
import { useLocale } from '@/components/locale-provider'
import { useTaskPolling } from '@/hooks/use-task-polling'

interface PendingTaskBannerProps {
  taskType: 'generate' | 'edit'
  onTaskFound: (taskId: string) => void
}

export function PendingTaskBanner({ taskType, onTaskFound }: PendingTaskBannerProps) {
  const { locale } = useLocale()
  const [checking, setChecking] = useState(true)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const polling = useTaskPolling(pendingTaskId)

  useEffect(() => {
    async function check() {
      const res = await getRecentPendingTask(taskType)
      if (res.success && res.data?.taskId) {
        setPendingTaskId(res.data.taskId)
        onTaskFound(res.data.taskId)
      }
      setChecking(false)
    }
    void check()
  }, [taskType, onTaskFound])

  if (checking || !pendingTaskId) return null
  if (polling.status === 'completed' || polling.status === 'failed') return null

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
      <Loader2 className="size-4 animate-spin text-primary" />
      <span>
        {locale === 'zh'
          ? `有一个任务正在${polling.status === 'pending' ? '排队' : '生成'}中... ${polling.elapsed}s`
          : `A task is ${polling.status === 'pending' ? 'queued' : 'generating'}... ${polling.elapsed}s`}
      </span>
    </div>
  )
}
