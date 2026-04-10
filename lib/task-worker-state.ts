export type TaskType = 'generate' | 'edit'

export type TaskTempSourceOutcome = 'completed' | 'failed' | 'retryable'

export function shouldCleanupTempSources(
  taskType: TaskType,
  outcome: TaskTempSourceOutcome | null
): boolean {
  return taskType === 'edit' && (outcome === 'completed' || outcome === 'failed')
}
