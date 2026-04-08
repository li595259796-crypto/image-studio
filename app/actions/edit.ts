'use server'

import { createClient } from '@/lib/supabase/server'
import { editImage } from '@/lib/image-api'
import { uploadImage, deleteImage as deleteStorageImage } from '@/lib/storage'
import { checkQuota, recordUsage } from '@/lib/quota'
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

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const quota = await checkQuota(supabase, user.id)
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

    const { path, publicUrl } = await uploadImage(
      supabase,
      user.id,
      resultBuffer
    )

    const { data: record, error: insertError } = await supabase
      .from('images')
      .insert({
        user_id: user.id,
        type: 'edit',
        prompt,
        storage_path: path,
        public_url: publicUrl,
        size_bytes: resultBuffer.length,
        source_images: sourceImageNames,
      })
      .select('id')
      .single()

    if (insertError) {
      await deleteStorageImage(supabase, path).catch(() => {})
      throw new Error('Failed to save image record')
    }

    await recordUsage(supabase, user.id, 'edit')

    return {
      success: true,
      data: { imageUrl: publicUrl, imageId: record.id },
    }
  } catch (error: unknown) {
    const isUserFacing =
      error instanceof Error &&
      !error.message.includes('supabase') &&
      !error.message.includes('storage')
    const message = isUserFacing
      ? (error as Error).message
      : 'Failed to edit image. Please try again.'
    return { success: false, error: message }
  }
}
