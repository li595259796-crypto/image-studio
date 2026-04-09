'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { createTask, recordUsageReturningId } from '@/lib/db/queries'
import { triggerWorker } from '@/lib/trigger-worker'
import type { ActionResult } from '@/lib/types'

interface SubmitResult {
  taskId: string
}

export async function generateImageAction(
  formData: FormData
): Promise<ActionResult<SubmitResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const prompt = formData.get('prompt') as string | null
    const aspectRatio = (formData.get('aspectRatio') as string) ?? '16:9'
    const quality = (formData.get('quality') as string) ?? '2K'

    if (!prompt?.trim()) {
      return { success: false, error: 'Prompt is required' }
    }

    const MAX_PROMPT_LENGTH = 2000
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return { success: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }
    }

    const VALID_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4'])
    const VALID_QUALITIES = new Set(['1K', '2K', '4K'])
    if (!VALID_ASPECT_RATIOS.has(aspectRatio)) {
      return { success: false, error: 'Invalid aspect ratio' }
    }
    if (!VALID_QUALITIES.has(quality)) {
      return { success: false, error: 'Invalid quality value' }
    }

    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: 'Quota exceeded',
        errorCode: 'quota_exceeded' as const,
        quota: {
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          monthlyUsed: quota.monthlyUsed,
          monthlyLimit: quota.monthlyLimit,
        },
      }
    }

    const usageLogId = await recordUsageReturningId(session.user.id, 'generate')
    const payload = JSON.stringify({ prompt, aspectRatio, quality })
    const taskId = await createTask({
      userId: session.user.id,
      type: 'generate',
      payload,
      usageLogId,
    })

    await triggerWorker()

    return { success: true, data: { taskId } }
  } catch {
    return { success: false, error: 'Failed to submit generation task. Please try again.' }
  }
}
