import { ALLOWED_MODEL_IDS, VALID_ASPECT_RATIOS } from '../models/constants.ts'
import type { ModelId } from '../models/types.ts'

export interface ParsedGenerateRequest {
  prompt: string
  aspectRatio: (typeof VALID_ASPECT_RATIOS)[number]
  canvasId: string
  modelIds: ModelId[]
}

export function parseGenerateRequest(
  raw: Record<string, unknown>
): ParsedGenerateRequest {
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : ''
  if (!prompt) {
    throw new Error('Prompt is required')
  }

  const canvasId = typeof raw.canvasId === 'string' ? raw.canvasId : ''
  if (!canvasId) {
    throw new Error('Canvas id is required')
  }

  const aspectRatio = raw.aspectRatio
  if (
    typeof aspectRatio !== 'string' ||
    !VALID_ASPECT_RATIOS.includes(
      aspectRatio as (typeof VALID_ASPECT_RATIOS)[number]
    )
  ) {
    throw new Error('Invalid aspect ratio')
  }

  if (!Array.isArray(raw.modelIds) || raw.modelIds.length === 0) {
    throw new Error('At least one model must be selected')
  }

  const deduped: ModelId[] = []
  for (const modelId of raw.modelIds) {
    if (
      typeof modelId !== 'string' ||
      !ALLOWED_MODEL_IDS.includes(modelId as ModelId)
    ) {
      throw new Error(`Unsupported model id: ${String(modelId)}`)
    }

    if (!deduped.includes(modelId as ModelId)) {
      deduped.push(modelId as ModelId)
    }
  }

  return {
    prompt,
    aspectRatio,
    canvasId,
    modelIds: deduped,
  }
}
