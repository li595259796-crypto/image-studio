'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { toImageActionFailureResult } from '@/lib/image-action-error'
import { uploadImage } from '@/lib/storage'
import { insertImage, recordUsage } from '@/lib/db/queries'
import { runModelGeneration } from '@/lib/models/router'
import { geminiFlashAdapter } from '@/lib/models/gemini-flash'
import type { ActionResult, ImageResult } from '@/lib/types'

export async function generateImageAction(
  formData: FormData
): Promise<ActionResult<ImageResult>> {
  const startedAt = Date.now()
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const prompt = formData.get('prompt') as string | null
    const aspectRatio = (formData.get('aspectRatio') as string) ?? '16:9'

    if (!prompt?.trim()) {
      return { success: false, error: 'Prompt is required' }
    }

    const MAX_PROMPT_LENGTH = 2000
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return { success: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }
    }

    const VALID_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4'])
    if (!VALID_ASPECT_RATIOS.has(aspectRatio)) {
      return { success: false, error: 'Invalid aspect ratio' }
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

    // Call 147ai adapter directly (sync, no SSE needed)
    const result = await runModelGeneration({
      adapter: geminiFlashAdapter,
      options: { prompt, aspectRatio: aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4' },
    })

    if (!result.ok) {
      return {
        success: false,
        error: result.message,
        errorCode: result.errorCode === 'timeout' ? 'upstream_timeout' : 'upstream_unavailable',
      }
    }

    const { url } = await uploadImage(session.user.id, result.data, result.mimeType)

    const record = await insertImage({
      userId: session.user.id,
      type: 'generate',
      prompt,
      aspectRatio,
      quality: '2K',
      blobUrl: url,
      sizeBytes: result.data.length,
    })

    await recordUsage(session.user.id, 'generate')

    return { success: true, data: { imageId: record.id, blobUrl: url } }
  } catch (err: unknown) {
    console.error('[image-action-failure]', {
      operation: 'generate',
      durationMs: Date.now() - startedAt,
      errorCode: err instanceof Error && 'kind' in err ? (err as { kind?: string }).kind : 'unexpected',
      message: err instanceof Error ? err.message : String(err),
      status: err instanceof Error && 'status' in err ? (err as { status?: number }).status ?? null : null,
    })
    return toImageActionFailureResult('generate', err)
  }
}
