import {
  extractImageBytes,
  fetchJsonWithTimeout,
  getTimeoutMsFromEnv,
  ImageApiError,
} from '../image-api.ts'
import type { AdapterResult, GenerateOptions, ModelAdapter } from './types.ts'

/** 147ai proxy uses OpenAI-compatible chat completions format */
interface ProxyResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

function getProxyUrl(): string {
  return process.env.IMAGE_API_URL ?? 'https://147ai.com/v1/chat/completions'
}

function getProxyModel(): string {
  return process.env.IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview'
}

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
    id: 'gemini-3.1-flash',
    label: 'Gemini 3.1 Flash',
    provider: 'google',
    supportsReferenceImages: false,
  },
  async generate(options: GenerateOptions): Promise<AdapterResult> {
    const apiKey = options.apiKey ?? process.env.IMAGE_API_KEY ?? ''
    const startedAt = Date.now()

    if (!apiKey) {
      return {
        ok: false,
        errorCode: 'misconfigured',
        message: 'IMAGE_API_KEY environment variable is not set',
        durationMs: 0,
      }
    }

    try {
      const prompt = [
        'Generate an image with the following specifications:',
        `- Prompt: ${options.prompt}`,
        `- Aspect ratio: ${options.aspectRatio}`,
      ].join('\n')

      const response = await fetchJsonWithTimeout<ProxyResponse>(
        getProxyUrl(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: getProxyModel(),
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 8192,
          }),
        },
        {
          timeoutMs: getTimeoutMsFromEnv('GEMINI_IMAGE_TIMEOUT_MS'),
          invalidResponseMessage: 'Gemini proxy returned invalid JSON',
        }
      )

      const content = response.choices?.[0]?.message?.content
      if (!content) {
        return {
          ok: false,
          errorCode: 'invalid_response',
          message: 'Gemini proxy response did not contain image content',
          durationMs: Date.now() - startedAt,
        }
      }

      const imageData = extractImageBytes(content)
      return {
        ok: true,
        data: imageData,
        mimeType: 'image/png',
        durationMs: Date.now() - startedAt,
      }
    } catch (error: unknown) {
      return toAdapterError(error, startedAt)
    }
  },
}
