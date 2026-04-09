import { generateImage, editImage } from '@/lib/image-api'
import { uploadImage } from '@/lib/storage'
import { insertImage, claimNextTask, markTaskCompleted, markTaskRetryable, markTaskFailed, deleteUsageLog } from '@/lib/db/queries'
import { del } from '@vercel/blob'
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
  attempts: number
  maxAttempts: number
  usageLogId: string | null
}): Promise<void> {
  let tempSourceUrls: string[] = []

  try {
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

      await markTaskCompleted(task.id, { imageId: record.id, blobUrl: url })
    } else {
      const payload = JSON.parse(task.payload) as EditTaskPayload
      tempSourceUrls = payload.sourceImageUrls

      const imageBuffers: Buffer[] = []
      for (const sourceUrl of payload.sourceImageUrls) {
        const response = await fetch(sourceUrl)
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

      await markTaskCompleted(task.id, { imageId: record.id, blobUrl: url })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const nextAttempts = task.attempts + 1

    if (nextAttempts < task.maxAttempts) {
      await markTaskRetryable(task.id, errorMessage, task.attempts)
    } else {
      await markTaskFailed(task.id, errorMessage, task.attempts)
      if (task.usageLogId) {
        await deleteUsageLog(task.usageLogId)
      }
    }
  } finally {
    if (tempSourceUrls.length > 0) {
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
