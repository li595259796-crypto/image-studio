// FROZEN (P4 async rollback): helper for the frozen task queue.
// Used only by app/actions/tasks.ts which is also frozen.
export type RecoverableTaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type TaskRecoveryAction = 'none' | 'kick' | 'recover-and-kick'

const PENDING_STALE_THRESHOLD_MS = 15 * 1000
const ZOMBIE_THRESHOLD_MS = 10 * 60 * 1000

export function getTaskRecoveryAction(
  task: { status: RecoverableTaskStatus | string; createdAt: Date; updatedAt: Date },
  now: number = Date.now()
): TaskRecoveryAction {
  if (task.status === 'pending' && now - task.createdAt.getTime() > PENDING_STALE_THRESHOLD_MS) {
    return 'kick'
  }

  if (task.status === 'processing' && now - task.updatedAt.getTime() > ZOMBIE_THRESHOLD_MS) {
    return 'recover-and-kick'
  }

  return 'none'
}
