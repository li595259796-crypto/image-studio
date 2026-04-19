export type ModelProvider = 'google' | 'bytedance' | 'alibaba' | '147ai'

export type ModelId =
  | 'gemini-3.1-flash'
  | 'seedream-5.0'
  | 'tongyi-wanx2.1'

export type QuotaSource = 'platform' | 'byok'

export interface GenerateOptions {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  quality?: '1K' | '2K' | '4K'
  apiKey?: string
  referenceImageUrls?: string[]
  /**
   * External abort signal. When client disconnects (closes tab / navigates
   * away), the API route propagates that abort through this field so the
   * adapter's upstream HTTP calls can be cancelled and the lambda can
   * return promptly instead of running to maxDuration.
   */
  signal?: AbortSignal
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
