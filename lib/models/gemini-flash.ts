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
    supportsReferenceImages: true,
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
      // Build message content: reference images (if any) + text prompt
      type ContentPart =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: string } }

      const content: ContentPart[] = []

      // Add reference images as base64 data URIs
      if (options.referenceImageUrls && options.referenceImageUrls.length > 0) {
        for (const url of options.referenceImageUrls) {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(30_000),
          })
          if (!response.ok) {
            return {
              ok: false,
              errorCode: 'provider_error',
              message: `Failed to fetch reference image: ${response.status}`,
              durationMs: Date.now() - startedAt,
            }
          }
          const buffer = Buffer.from(await response.arrayBuffer())
          const mimeType = response.headers.get('content-type') ?? 'image/png'
          const b64 = buffer.toString('base64')
          content.push({
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${b64}`, detail: 'high' },
          })
        }
      }

      const textPrompt = [
        'Generate an image with the following specifications:',
        `- Prompt: ${options.prompt}`,
        `- Aspect ratio: ${options.aspectRatio}`,
      ].join('\n')
      content.push({ type: 'text', text: textPrompt })

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
            messages: [{ role: 'user', content }],
            max_tokens: 8192,
          }),
        },
        {
          timeoutMs: getTimeoutMsFromEnv('GEMINI_IMAGE_TIMEOUT_MS'),
          invalidResponseMessage: 'Gemini proxy returned invalid JSON',
        }
      )

      const responseContent = response.choices?.[0]?.message?.content
      if (!responseContent) {
        return {
          ok: false,
          errorCode: 'invalid_response',
          message: 'Gemini proxy response did not contain image content',
          durationMs: Date.now() - startedAt,
        }
      }

      const imageData = extractImageBytes(responseContent)
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
