'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { editImage } from '@/lib/image-api'
import { toImageActionFailureResult } from '@/lib/image-action-error'
import { uploadImage } from '@/lib/storage'
import { insertImage, recordUsage } from '@/lib/db/queries'
import { fileTypeFromBuffer } from 'file-type'
import type { ActionResult, ImageResult } from '@/lib/types'

// TEMP: timing instrumentation to diagnose 504s. Remove once root cause is found.
function tlog(label: string, t0: number): void {
  console.error(`[edit-timing] ${label} +${Date.now() - t0}ms`)
}

export async function editImageAction(
  formData: FormData
): Promise<ActionResult<ImageResult>> {
  const t0 = Date.now()
  console.error(`[edit-timing] T0 action start`)
  try {
    const session = await auth()
    tlog('T1 auth done', t0)
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

    const imageBuffers: Buffer[] = [buffer1]

    if (image2 && image2.size > 0) {
      const buffer2 = Buffer.from(await image2.arrayBuffer())
      const detected2 = await fileTypeFromBuffer(buffer2)
      if (!detected2 || !ALLOWED_MIMES.includes(detected2.mime)) {
        return { success: false, error: 'File 2 content does not match a supported image format' }
      }
      imageBuffers.push(buffer2)
    }
    tlog(`T2 magic-byte done (${imageBuffers.length} img, ${imageBuffers.reduce((s, b) => s + b.length, 0)} bytes)`, t0)

    const quota = await checkQuota(session.user.id)
    tlog('T3 quota check done', t0)
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

    const resultBuffer = await editImage(prompt, imageBuffers)
    tlog(`T4 editImage API done (result ${resultBuffer.length} bytes)`, t0)

    const { url } = await uploadImage(session.user.id, resultBuffer)
    tlog('T5 blob upload done', t0)

    const record = await insertImage({
      userId: session.user.id,
      type: 'edit',
      prompt,
      blobUrl: url,
      sizeBytes: resultBuffer.length,
    })
    tlog('T6 insertImage done', t0)

    await recordUsage(session.user.id, 'edit')
    tlog('T7 recordUsage done (total)', t0)

    return { success: true, data: { imageId: record.id, blobUrl: url } }
  } catch (err: unknown) {
    tlog(`TX error: ${err instanceof Error ? err.message : String(err)}`, t0)
    console.error('[image-action-failure]', {
      operation: 'edit',
      durationMs: Date.now() - t0,
      errorCode: err instanceof Error && 'kind' in err ? (err as { kind?: string }).kind : 'unexpected',
      message: err instanceof Error ? err.message : String(err),
      status: err instanceof Error && 'status' in err ? (err as { status?: number }).status ?? null : null,
    })
    return toImageActionFailureResult('edit', err)
  }
}
