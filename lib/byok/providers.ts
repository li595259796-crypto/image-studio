export const SUPPORTED_BYOK_PROVIDERS = [
  'google',
  'bytedance',
  'alibaba',
] as const

export type ByokProvider = (typeof SUPPORTED_BYOK_PROVIDERS)[number]

export const BYOK_PROVIDER_META: Record<
  ByokProvider,
  {
    title: string
    description: string
  }
> = {
  google: {
    title: 'Google AI Studio',
    description: 'Gemini Flash image generation',
  },
  bytedance: {
    title: 'ByteDance Ark',
    description: 'Seedream image generation',
  },
  alibaba: {
    title: 'Alibaba DashScope',
    description: 'Tongyi Wanx image generation',
  },
}

export function isByokProvider(value: string): value is ByokProvider {
  return SUPPORTED_BYOK_PROVIDERS.includes(value as ByokProvider)
}
