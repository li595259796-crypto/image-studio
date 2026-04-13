import type { ModelDefinition, ModelId } from './types.ts'

export const MODEL_DEFINITIONS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini Flash',
    provider: 'google',
    supportsReferenceImages: false,
  },
  {
    id: 'seedream-5.0',
    label: 'Seedream 5.0',
    provider: 'bytedance',
    supportsReferenceImages: true,
  },
  {
    id: 'tongyi-wanx2.1',
    label: 'Tongyi Wanx 2.1',
    provider: 'alibaba',
    supportsReferenceImages: true,
  },
] as const satisfies readonly ModelDefinition[]

export const ALLOWED_MODEL_IDS = MODEL_DEFINITIONS.map((item) => item.id)

export const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const

export function getModelDefinition(modelId: ModelId): ModelDefinition {
  const found = MODEL_DEFINITIONS.find((item) => item.id === modelId)

  if (!found) {
    throw new Error(`Unsupported model id: ${modelId}`)
  }

  return found
}

export function supportsReferenceImages(modelId: ModelId): boolean {
  return getModelDefinition(modelId).supportsReferenceImages
}
