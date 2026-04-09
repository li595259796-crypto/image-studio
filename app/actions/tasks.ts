'use server'

import { auth } from '@/lib/auth'
import { getTaskById, getRecentPendingTaskByType, resetTaskForRetry, recordUsageReturningId } from '@/lib/db/queries'
import { checkQuota } from '@/lib/quota'
import { after } from 'next/server'
import { triggerWorker } from '@/lib/trigger-worker'
import type { ActionResult, TaskStatusResult } from '@/lib/types'

const PENDING_STALE_THRESHOLD_MS = 15 * 1000
const ZOMBIE_THRESHOLD_MS = 10 * 60 * 1000

function shouldReKick(task: { status: string; createdAt: Date; updatedAt: Date }): boolean {
  const now = Date.now()
  if (task.status === 'pending' && now - task.createdAt.getTime() > PENDING_STALE_THRESHOLD_MS) {
    return true
  }
  if (task.status === 'processing' && now - task.updatedAt.getTime() > ZOMBIE_THRESHOLD_MS) {
    return true
  }
  return false
}

export async function getTaskStatus(
  taskId: string
): Promise<ActionResult<TaskStatusResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const task = await getTaskById(taskId, session.user.id)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Hobby fallback: re-kick worker if task appears stuck (no recoverZombieTasks here — cron handles that)
    if (shouldReKick(task)) {
      after(async () => { await triggerWorker() })
    }

    const parsed = task.result ? JSON.parse(task.result) as { imageId: string; blobUrl: string } : undefined

    return {
      success: true,
      data: {
        status: task.status as TaskStatusResult['status'],
        result: parsed,
        error: task.lastError ?? undefined,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        createdAt: task.createdAt.toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'Failed to get task status' }
  }
}

export async function getRecentPendingTask(
  type: 'generate' | 'edit'
): Promise<ActionResult<({ taskId: string } & TaskStatusResult) | undefined>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const task = await getRecentPendingTaskByType(session.user.id, type)
    if (!task) {
      return { success: true, data: undefined }
    }

    if (shouldReKick(task)) {
      after(async () => { await triggerWorker() })
    }

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status as TaskStatusResult['status'],
        error: task.lastError ?? undefined,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        createdAt: task.createdAt.toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'Failed to check pending tasks' }
  }
}

export async function retryTaskAction(
  taskId: string
): Promise<ActionResult<{ taskId: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const task = await getTaskById(taskId, session.user.id)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status !== 'failed') {
      return { success: false, error: 'Only failed tasks can be retried' }
    }

    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: 'Quota exceeded',
        errorCode: 'quota_exceeded',
        quota: {
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          monthlyUsed: quota.monthlyUsed,
          monthlyLimit: quota.monthlyLimit,
        },
      }
    }

    const usageLogId = await recordUsageReturningId(session.user.id, task.type as 'generate' | 'edit')
    await resetTaskForRetry(taskId, usageLogId)
    after(async () => { await triggerWorker() })

    return { success: true, data: { taskId } }
  } catch {
    return { success: false, error: 'Failed to retry task' }
  }
}
