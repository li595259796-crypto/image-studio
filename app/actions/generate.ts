'use server'

import { auth } from '@/lib/auth'
import { generateImage } from '@/lib/image-api'
import { uploadImage, deleteImage } from '@/lib/storage'
import { checkQuota, recordUsage } from '@/lib/quota'
import { insertImage } from '@/lib/db/queries'
import type { ActionResult } from '@/lib/types'

interface GenerateResult {
  imageUrl: string
  imageId: string
}

export async function generateImageAction(
  formData: FormData
): Promise<ActionResult<GenerateResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
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

    const imageBuffer = await generateImage(prompt, aspectRatio, quality)

    const { url } = await uploadImage(session.user.id, imageBuffer)

    const record = await insertImage({
      userId: session.user.id,
      type: 'generate',
      prompt,
      aspectRatio,
      quality,
      blobUrl: url,
      sizeBytes: imageBuffer.length,
    })

    // If DB insert failed but upload succeeded, clean up
    if (!record) {
      await deleteImage(url)
      return { success: false, error: 'Failed to save image record' }
    }

    await recordUsage(session.user.id, 'generate')

    return {
      success: true,
      data: { imageUrl: url, imageId: record.id },
    }
  } catch (error: unknown) {
    const isUserFacing =
      error instanceof Error &&
      !error.message.includes('database') &&
      !error.message.includes('blob')
    const message = isUserFacing
      ? (error as Error).message
      : 'Failed to generate image. Please try again.'
    return { success: false, error: message }
  }
}
