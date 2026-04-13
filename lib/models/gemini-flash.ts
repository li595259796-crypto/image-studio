import {
  decodeBase64Image,
  fetchJsonWithTimeout,
  getTimeoutMsFromEnv,
  ImageApiError,
} from '../image-api.ts'
import type { AdapterResult, GenerateOptions, ModelAdapter } from './types.ts'

interface GeminiResponsePart {
  inlineData?: {
    mimeType?: 'image/png' | 'image/jpeg' | 'image/webp'
    data?: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[]
    }
    finishReason?: string
  }>
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'

function toAdapterError(
  error: unknown,
  startedAt: number
): Extract<AdapterResult, { ok: false }> {
  if (error instanceof ImageApiError) {
    return {
      ok: false,
      errorCode:
        error.kind === 'timeout'
          ? 'timeout'
          : error.kind === 'misconfigured'
            ? 'misconfigured'
            : error.kind === 'upstream_http' && error.status === 429
              ? 'rate_limited'
              : 'provider_error',
      message: error.message,
      status: error.status,
      durationMs: Date.now() - startedAt,
    }
  }

  return {
    ok: false,
    errorCode: 'provider_error',
    message:
      error instanceof Error ? error.message : 'Unknown provider failure',
    durationMs: Date.now() - startedAt,
  }
}

export const geminiFlashAdapter: ModelAdapter = {
  definition: {
    id: 'gemini-2.5-flash',
    label: 'Gemini Flash',
    provider: 'google',
    supportsReferenceImages: false,
  },
  async generate(options: GenerateOptions): Promise<AdapterResult> {
    const apiKey = options.apiKey ?? process.env.GOOGLE_AI_KEY ?? ''
    const startedAt = Date.now()

    if (!apiKey) {
      return {
        ok: false,
        errorCode: 'misconfigured',
        message: 'GOOGLE_AI_KEY environment variable is not set',
        durationMs: 0,
      }
    }

    try {
      const response = await fetchJsonWithTimeout<GeminiResponse>(
        GEMINI_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: options.prompt }] }],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig: {
                aspectRatio: options.aspectRatio,
              },
            },
          }),
        },
        {
          timeoutMs: getTimeoutMsFromEnv('GEMINI_IMAGE_TIMEOUT_MS'),
          invalidResponseMessage: 'Gemini returned invalid JSON',
        }
      )

      const parts = response.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            ok: true,
            data: decodeBase64Image(part.inlineData.data),
            mimeType: part.inlineData.mimeType ?? 'image/png',
            durationMs: Date.now() - startedAt,
          }
        }
      }

      return {
        ok: false,
        errorCode: 'invalid_response',
        message: `Gemini response did not contain image bytes`,
        durationMs: Date.now() - startedAt,
      }
    } catch (error: unknown) {
      return toAdapterError(error, startedAt)
    }
  },
}
