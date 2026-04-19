'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { executeEditImage, validateEditInput } from '@/lib/image/edit'
import { toImageActionFailureResult } from '@/lib/image-action-error'
import { uploadImage } from '@/lib/storage'
import { recordUsage } from '@/lib/db/queries'
import { fileTypeFromBuffer } from 'file-type'
import type { ActionResult, ImageResult } from '@/lib/types'

export async function editImageAction(
  formData: FormData
): Promise<ActionResult<ImageResult>> {
  const startedAt = Date.now()
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

    if (image1.size > MAX_SIZE) {
      return { success: false, error: 'Image 1 exceeds the 10 MB limit' }
    }
    if (image2 && image2.size > 0 && image2.size > MAX_SIZE) {
      return { success: false, error: 'Image 2 exceeds the 10 MB limit' }
    }

    // Magic-byte validation (server-side, not trusting client File.type)
    const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    const buffer1 = Buffer.from(await image1.arrayBuffer())
    const detected1 = await fileTypeFromBuffer(buffer1)
    if (!detected1 || !ALLOWED_MIMES.includes(detected1.mime)) {
      return { success: false, error: 'File content does not match a supported image format' }
    }

    if (image2 && image2.size > 0) {
      const buffer2 = Buffer.from(await image2.arrayBuffer())
      const detected2 = await fileTypeFromBuffer(buffer2)
      if (!detected2 || !ALLOWED_MIMES.includes(detected2.mime)) {
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

    // Upload reference images first, then run edit via shared lib
    const referenceUrls: string[] = []
    for (const file of [image1, image2]) {
      if (!file || file.size === 0) continue
      const buffer = Buffer.from(await file.arrayBuffer())
      const { url } = await uploadImage(session.user.id, buffer)
      referenceUrls.push(url)
    }

    const validated = validateEditInput({
      prompt,
      referenceImages: referenceUrls,
      modelIds: ['gemini-3.1-flash'],
    })
    if (!validated.ok) {
      return { success: false, error: validated.error }
    }

    const editResult = await executeEditImage({
      userId: session.user.id,
      input: validated.data,
    })

    if (!editResult.ok) {
      return { success: false, error: editResult.error }
    }

    const result = editResult.results[0]
    if (!result || !result.imageId || !result.blobUrl) {
      return {
        success: false,
        error: result?.message ?? 'Edit failed',
      }
    }

    await recordUsage(session.user.id, 'edit')

    return { success: true, data: { imageId: result.imageId, blobUrl: result.blobUrl } }
  } catch (err: unknown) {
    console.error('[image-action-failure]', {
      operation: 'edit',
      durationMs: Date.now() - startedAt,
      errorCode: err instanceof Error && 'kind' in err ? (err as { kind?: string }).kind : 'unexpected',
      message: err instanceof Error ? err.message : String(err),
      status: err instanceof Error && 'status' in err ? (err as { status?: number }).status ?? null : null,
    })
    return toImageActionFailureResult('edit', err)
  }
}
