// FROZEN (P4 async rollback): This file is part of the async task queue
// that was rolled back on 2026-04-10 in favor of sync actions on Vercel Hobby.
// Kept in tree for future re-activation (see feedback_sync_over_async_mvp.md).
// No live UI code references these actions.
'use server'

import { auth } from '@/lib/auth'
import {
  getTaskById,
  getRecentPendingTaskByType,
  recoverZombieTasks,
  resetTaskForRetry,
  recordUsageReturningId,
} from '@/lib/db/queries'
import { checkQuota } from '@/lib/quota'
import { triggerWorker } from '@/lib/trigger-worker'
import { getTaskRecoveryAction } from '@/lib/task-recovery'
import type { ActionResult, TaskStatusResult } from '@/lib/types'

async function recoverAndKickIfNeeded(task: {
  status: string
  createdAt: Date
  updatedAt: Date
}): Promise<void> {
  const action = getTaskRecoveryAction(task)
  if (action === 'recover-and-kick') {
    await recoverZombieTasks()
    await triggerWorker()
  } else if (action === 'kick') {
    await triggerWorker()
  }
}

export async function getTaskStatus(
  taskId: string
): Promise<ActionResult<TaskStatusResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    let task = await getTaskById(taskId, session.user.id)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Hobby fallback: recover zombie processing tasks, then re-kick worker.
    await recoverAndKickIfNeeded(task)

    const refreshedTask = await getTaskById(taskId, session.user.id)
    if (refreshedTask) {
      task = refreshedTask
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

    let task = await getRecentPendingTaskByType(session.user.id, type)
    if (!task) {
      return { success: true, data: undefined }
    }

    await recoverAndKickIfNeeded(task)

    const refreshedTask = await getTaskById(task.id, session.user.id)
    if (refreshedTask) {
      task = refreshedTask
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
    await triggerWorker()

    return { success: true, data: { taskId } }
  } catch {
    return { success: false, error: 'Failed to retry task' }
  }
}
