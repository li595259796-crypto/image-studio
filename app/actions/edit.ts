'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { createTask, recordUsageReturningId } from '@/lib/db/queries'
import { triggerWorker } from '@/lib/trigger-worker'
import { put } from '@vercel/blob'
import { fileTypeFromBuffer, type FileTypeResult } from 'file-type'
import type { ActionResult } from '@/lib/types'

interface SubmitResult {
  taskId: string
}

export async function editImageAction(
  formData: FormData
): Promise<ActionResult<SubmitResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const prompt = formData.get('prompt') as string | null
    const image1 = formData.get('image1') as File | null
    const image2 = formData.get('image2') as File | null

    if (!prompt?.trim()) {
      return { success: false, error: 'Prompt is required' }
    }

    const MAX_PROMPT_LENGTH = 2000
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return { success: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }
    }

    if (!image1 || image1.size === 0) {
      return { success: false, error: 'At least one image is required' }
    }

    const MAX_SIZE = 10 * 1024 * 1024
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

    if (image1.size > MAX_SIZE) {
      return { success: false, error: 'Image 1 exceeds the 10 MB limit' }
    }
    if (image2 && image2.size > 0) {
      if (image2.size > MAX_SIZE) {
        return { success: false, error: 'Image 2 exceeds the 10 MB limit' }
      }
    }

    // Magic-byte validation (server-side, not trusting client File.type)
    const buffer1 = Buffer.from(await image1.arrayBuffer())
    const detected1 = await fileTypeFromBuffer(buffer1)
    if (!detected1 || !ALLOWED_TYPES.includes(detected1.mime)) {
      return { success: false, error: 'File content does not match a supported image format' }
    }

    let buffer2: Buffer | null = null
    let detected2: FileTypeResult | undefined
    if (image2 && image2.size > 0) {
      buffer2 = Buffer.from(await image2.arrayBuffer())
      detected2 = await fileTypeFromBuffer(buffer2)
      if (!detected2 || !ALLOWED_TYPES.includes(detected2.mime)) {
        return { success: false, error: 'File 2 content does not match a supported image format' }
      }
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

    const tempId = crypto.randomUUID()
    const sourceImageUrls: string[] = []

    const blob1 = await put(`temp/${session.user.id}/${tempId}/source-0.png`, buffer1, {
      access: 'public',
      contentType: detected1.mime,
    })
    sourceImageUrls.push(blob1.url)

    if (buffer2) {
      const blob2 = await put(`temp/${session.user.id}/${tempId}/source-1.png`, buffer2, {
        access: 'public',
        contentType: detected2!.mime,
      })
      sourceImageUrls.push(blob2.url)
    }

    const usageLogId = await recordUsageReturningId(session.user.id, 'edit')
    const payload = JSON.stringify({ prompt, sourceImageUrls })
    const taskId = await createTask({
      userId: session.user.id,
      type: 'edit',
      payload,
      usageLogId,
    })

    triggerWorker()

    return { success: true, data: { taskId } }
  } catch {
    return { success: false, error: 'Failed to submit edit task. Please try again.' }
  }
}
