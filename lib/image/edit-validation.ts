import type { ModelId } from '@/lib/models/types'

const MAX_PROMPT_LENGTH = 2000
const MAX_REFERENCE_IMAGES = 2

// SSRF guard: only allow Vercel Blob storage URLs.
export function isAllowedImageUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.blob.vercel-storage.com')
    )
  } catch {
    return false
  }
}

export type EditInputRaw = {
  prompt?: unknown
  referenceImages?: unknown
  modelIds?: unknown
}

export type EditInputValid = {
  prompt: string
  referenceImageUrls: string[]
  modelIds: ModelId[]
}

export type EditValidationResult =
  | { ok: true; data: EditInputValid }
  | { ok: false; error: string }

export function validateEditInput(raw: EditInputRaw): EditValidationResult {
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : ''
  if (!prompt) {
    return { ok: false, error: 'Prompt is required' }
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }
  }

  if (!Array.isArray(raw.referenceImages) || raw.referenceImages.length === 0) {
    return { ok: false, error: 'At least one reference image is required' }
  }
  if (raw.referenceImages.length > MAX_REFERENCE_IMAGES) {
    return { ok: false, error: `At most ${MAX_REFERENCE_IMAGES} reference images are supported` }
  }

  const referenceImageUrls: string[] = []
  for (const url of raw.referenceImages) {
    if (typeof url !== 'string' || !isAllowedImageUrl(url)) {
      return { ok: false, error: 'Invalid reference image URL' }
    }
    referenceImageUrls.push(url)
  }

  if (!Array.isArray(raw.modelIds) || raw.modelIds.length === 0) {
    return { ok: false, error: 'At least one model must be specified' }
  }

  return {
    ok: true,
    data: {
      prompt,
      referenceImageUrls,
      modelIds: raw.modelIds as ModelId[],
    },
  }
}
