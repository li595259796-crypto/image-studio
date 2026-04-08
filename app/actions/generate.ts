'use server'

import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/image-api'
import { uploadImage, deleteImage as deleteStorageImage } from '@/lib/storage'
import { checkQuota, recordUsage } from '@/lib/quota'
import type { ActionResult } from '@/lib/types'

interface GenerateResult {
  imageUrl: string
  imageId: string
}

export async function generateImageAction(
  formData: FormData
): Promise<ActionResult<GenerateResult>> {
  try {
    const prompt = formData.get('prompt') as string | null
    const aspectRatio = (formData.get('aspectRatio') as string) ?? '1:1'
    const quality = (formData.get('quality') as string) ?? 'standard'

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

    const imageBuffer = await generateImage(prompt, aspectRatio, quality)

    const { path, publicUrl } = await uploadImage(
      supabase,
      user.id,
      imageBuffer
    )

    const { data: record, error: insertError } = await supabase
      .from('images')
      .insert({
        user_id: user.id,
        type: 'generate',
        prompt,
        aspect_ratio: aspectRatio,
        quality,
        storage_path: path,
        public_url: publicUrl,
        size_bytes: imageBuffer.length,
      })
      .select('id')
      .single()

    if (insertError) {
      await deleteStorageImage(supabase, path).catch(() => {})
      throw new Error('Failed to save image record')
    }

    await recordUsage(supabase, user.id, 'generate')

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
      : 'Failed to generate image. Please try again.'
    return { success: false, error: message }
  }
}
