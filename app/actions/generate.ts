'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { generateImage } from '@/lib/image-api'
import { toImageActionFailureResult } from '@/lib/image-action-error'
import { uploadImage } from '@/lib/storage'
import { insertImage, recordUsage } from '@/lib/db/queries'
import type { ActionResult, ImageResult } from '@/lib/types'

// TEMP: timing instrumentation to diagnose 504s. Remove once root cause is found.
function tlog(label: string, t0: number): void {
  console.error(`[generate-timing] ${label} +${Date.now() - t0}ms`)
}

export async function generateImageAction(
  formData: FormData
): Promise<ActionResult<ImageResult>> {
  const t0 = Date.now()
  console.error(`[generate-timing] T0 action start`)
  try {
    const session = await auth()
    tlog('T1 auth done', t0)
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
    tlog('T2 quota check done', t0)
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
    tlog(`T3 generateImage API done (result ${imageBuffer.length} bytes)`, t0)

    const { url } = await uploadImage(session.user.id, imageBuffer)
    tlog('T4 blob upload done', t0)

    const record = await insertImage({
      userId: session.user.id,
      type: 'generate',
      prompt,
      aspectRatio,
      quality,
      blobUrl: url,
      sizeBytes: imageBuffer.length,
    })
    tlog('T5 insertImage done', t0)

    await recordUsage(session.user.id, 'generate')
    tlog('T6 recordUsage done (total)', t0)

    return { success: true, data: { imageId: record.id, blobUrl: url } }
  } catch (err: unknown) {
    tlog(`TX error: ${err instanceof Error ? err.message : String(err)}`, t0)
    console.error('[image-action-failure]', {
      operation: 'generate',
      durationMs: Date.now() - t0,
      errorCode: err instanceof Error && 'kind' in err ? (err as { kind?: string }).kind : 'unexpected',
      message: err instanceof Error ? err.message : String(err),
      status: err instanceof Error && 'status' in err ? (err as { status?: number }).status ?? null : null,
    })
    return toImageActionFailureResult('generate', err)
  }
}
