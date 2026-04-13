export type ModelProvider = 'google' | 'bytedance' | 'alibaba' | '147ai'

export type ModelId =
  | 'gemini-2.5-flash'
  | 'seedream-5.0'
  | 'tongyi-wanx2.1'

export type QuotaSource = 'platform' | 'byok'

export interface GenerateOptions {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  quality?: '1K' | '2K' | '4K'
  apiKey?: string
  referenceImageUrls?: string[]
}

export type AdapterResult =
  | {
      ok: true
      data: Uint8Array
      mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
      durationMs: number
    }
  | {
      ok: false
      errorCode:
        | 'timeout'
        | 'provider_error'
        | 'invalid_response'
        | 'misconfigured'
        | 'rate_limited'
      message: string
      durationMs: number
      status?: number
    }

export interface ModelDefinition {
  id: ModelId
  label: string
  provider: ModelProvider
  supportsReferenceImages: boolean
}

export interface ModelAdapter {
  definition: ModelDefinition
  generate(options: GenerateOptions): Promise<AdapterResult>
}
