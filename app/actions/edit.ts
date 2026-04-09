'use server'

import { auth } from '@/lib/auth'
import { editImage } from '@/lib/image-api'
import { uploadImage, deleteImage } from '@/lib/storage'
import { checkQuota, recordUsage } from '@/lib/quota'
import { insertImage } from '@/lib/db/queries'
import type { ActionResult } from '@/lib/types'

interface EditResult {
  imageUrl: string
  imageId: string
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function editImageAction(
  formData: FormData
): Promise<ActionResult<EditResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
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

    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

    if (image1.size > MAX_SIZE) {
      return { success: false, error: 'Image 1 exceeds the 10 MB limit' }
    }
    if (!ALLOWED_TYPES.includes(image1.type)) {
      return { success: false, error: 'Unsupported image format. Use PNG, JPEG, WebP, or GIF' }
    }
    if (image2 && image2.size > 0) {
      if (image2.size > MAX_SIZE) {
        return { success: false, error: 'Image 2 exceeds the 10 MB limit' }
      }
      if (!ALLOWED_TYPES.includes(image2.type)) {
        return { success: false, error: 'Unsupported image format for image 2' }
      }
    }

    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: `Quota exceeded. Daily: ${quota.dailyUsed}/${quota.dailyLimit}, Monthly: ${quota.monthlyUsed}/${quota.monthlyLimit}`,
      }
    }

    const imageBuffers: Buffer[] = [await fileToBuffer(image1)]
    if (image2 && image2.size > 0) {
      imageBuffers.push(await fileToBuffer(image2))
    }

    const sourceImageNames = [image1.name]
    if (image2 && image2.size > 0) {
      sourceImageNames.push(image2.name)
    }

    const resultBuffer = await editImage(prompt, imageBuffers)

    const { url } = await uploadImage(session.user.id, resultBuffer)

    const record = await insertImage({
      userId: session.user.id,
      type: 'edit',
      prompt,
      blobUrl: url,
      sizeBytes: resultBuffer.length,
      sourceImages: JSON.stringify(sourceImageNames),
    })

    // If DB insert failed but upload succeeded, clean up
    if (!record) {
      await deleteImage(url)
      return { success: false, error: 'Failed to save image record' }
    }

    await recordUsage(session.user.id, 'edit')

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
      : 'Failed to edit image. Please try again.'
    return { success: false, error: message }
  }
}
