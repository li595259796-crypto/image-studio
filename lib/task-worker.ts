// FROZEN (P4 async rollback): worker engine kept for future re-activation.
// No sync code path uses this; only /api/worker/process and /api/cron/process-tasks
// still import it, but those routes are orphaned without a client trigger.
import { generateImage, editImage } from '@/lib/image-api'
import { uploadImage } from '@/lib/storage'
import { insertImage, claimNextTask, saveTaskResult, markTaskCompleted, markTaskRetryable, markTaskFailed, deleteUsageLog } from '@/lib/db/queries'
import { del } from '@vercel/blob'
import { shouldCleanupTempSources, type TaskTempSourceOutcome } from '@/lib/task-worker-state'
import type { GenerateTaskPayload, EditTaskPayload } from '@/lib/types'

async function cleanupTempSources(sourceUrls: string[]): Promise<void> {
  for (const url of sourceUrls) {
    try {
      await del(url)
    } catch {
      // Non-fatal
    }
  }
}

async function executeTask(task: {
  id: string
  userId: string
  type: 'generate' | 'edit'
  payload: string
  result: string | null
  attempts: number
  maxAttempts: number
  usageLogId: string | null
}): Promise<void> {
  let tempSourceUrls: string[] = []
  let tempSourceOutcome: TaskTempSourceOutcome | null = null

  try {
    if (task.type === 'edit') {
      const payload = JSON.parse(task.payload) as EditTaskPayload
      tempSourceUrls = payload.sourceImageUrls
    }

    // Idempotency: if task already has a result (prior attempt succeeded at insertImage
    // but failed at markTaskCompleted), skip re-execution and just mark completed
    if (task.result) {
      const existing = JSON.parse(task.result) as { imageId: string; blobUrl: string }
      await markTaskCompleted(task.id, existing)
      tempSourceOutcome = 'completed'
      return
    }

    if (task.type === 'generate') {
      const payload = JSON.parse(task.payload) as GenerateTaskPayload
      const imageBuffer = await generateImage(payload.prompt, payload.aspectRatio, payload.quality)
      const { url } = await uploadImage(task.userId, imageBuffer)

      const record = await insertImage({
        userId: task.userId,
        type: 'generate',
        prompt: payload.prompt,
        aspectRatio: payload.aspectRatio,
        quality: payload.quality,
        blobUrl: url,
        sizeBytes: imageBuffer.length,
      })

      // Save result immediately for idempotency — if markTaskCompleted crashes,
      // the result is preserved and the retry path (task.result check) will skip re-execution
      const taskResult = { imageId: record.id, blobUrl: url }
      await saveTaskResult(task.id, taskResult)
      await markTaskCompleted(task.id, taskResult)
    } else {
      const payload = JSON.parse(task.payload) as EditTaskPayload

      const imageBuffers: Buffer[] = []
      for (const sourceUrl of payload.sourceImageUrls) {
        // SSRF guard: only fetch from Vercel Blob storage (hostname check, not substring)
        const parsed = new URL(sourceUrl)
        if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.blob.vercel-storage.com')) {
          throw new Error('Rejected fetch to disallowed URL')
        }
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) })
        if (!response.ok) {
          throw new Error(`Failed to fetch source image: ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        imageBuffers.push(Buffer.from(arrayBuffer))
      }

      const resultBuffer = await editImage(payload.prompt, imageBuffers)
      const { url } = await uploadImage(task.userId, resultBuffer)

      const record = await insertImage({
        userId: task.userId,
        type: 'edit',
        prompt: payload.prompt,
        blobUrl: url,
        sizeBytes: resultBuffer.length,
        sourceImages: JSON.stringify(payload.sourceImageUrls.map((_, i) => `source-${i}.png`)),
      })

      const taskResult = { imageId: record.id, blobUrl: url }
      await saveTaskResult(task.id, taskResult)
      await markTaskCompleted(task.id, taskResult)
      tempSourceOutcome = 'completed'
    }
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[task-worker] Task failed', { taskId: task.id, type: task.type, error: rawMessage })

    // Sanitize error for user-facing lastError.
    // SAFETY: the fallback 'Image processing failed' is intentionally generic —
    // any unrecognized error falls through to it, ensuring no internal details leak.
    const normalizedMessage = rawMessage.toLowerCase()
    let errorMessage = 'Image processing failed'
    if (normalizedMessage.includes('timeout') || normalizedMessage.includes('abort') || normalizedMessage.includes('aborted')) {
      errorMessage = 'Processing timed out, will retry'
    } else if (normalizedMessage.includes('source image')) {
      errorMessage = 'Failed to load source image'
    } else if (normalizedMessage.includes('quota') || normalizedMessage.includes('rate')) {
      errorMessage = 'API rate limit reached, will retry'
    }

    const nextAttempts = task.attempts + 1

    if (nextAttempts < task.maxAttempts) {
      await markTaskRetryable(task.id, errorMessage, task.attempts)
      tempSourceOutcome = 'retryable'
    } else {
      await markTaskFailed(task.id, errorMessage, task.attempts)
      if (task.usageLogId) {
        await deleteUsageLog(task.usageLogId)
      }
      tempSourceOutcome = 'failed'
    }
  } finally {
    if (shouldCleanupTempSources(task.type, tempSourceOutcome) && tempSourceUrls.length > 0) {
      await cleanupTempSources(tempSourceUrls)
    }
  }
}

export async function processNextTask(): Promise<boolean> {
  const task = await claimNextTask()
  if (!task) return false
  await executeTask(task)
  return true
}

export async function runWorkerLoop(options: {
  maxTasks?: number
  maxDurationMs?: number
} = {}): Promise<number> {
  const maxTasks = options.maxTasks ?? 3
  const maxDurationMs = options.maxDurationMs ?? 4 * 60 * 1000
  const startTime = Date.now()
  let processed = 0

  while (processed < maxTasks && (Date.now() - startTime) < maxDurationMs) {
    const found = await processNextTask()
    if (!found) break
    processed++
  }

  return processed
}
