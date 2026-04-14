import {
  fetchBytesWithTimeout,
  fetchJsonWithTimeout,
  getTimeoutMsFromEnv,
  ImageApiError,
} from '../image-api.ts'
import type { AdapterResult, GenerateOptions, ModelAdapter } from './types.ts'

interface TongyiContentPart {
  image?: string
  type?: string
}

interface TongyiResponse {
  output?: {
    choices?: Array<{
      message?: {
        content?: TongyiContentPart[]
      }
    }>
  }
}

const ASPECT_TO_TONGYI_SIZE: Record<GenerateOptions['aspectRatio'], string> = {
  '1:1': '1280*1280',
  '16:9': '1376*768',
  '9:16': '768*1376',
  '4:3': '1365*1024',
  '3:4': '1024*1365',
}

// Hardcoded endpoints — never accept arbitrary URLs from env vars (SSRF prevention).
const TONGYI_ENDPOINTS = {
  intl: 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  cn: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
} as const

// Safe image URL domains — provider-returned URLs are validated before fetch.
const TONGYI_IMAGE_DOMAINS = ['.aliyuncs.com', '.alicdn.com'] as const

function getTongyiEndpoint(): string {
  return process.env.DASHSCOPE_REGION === 'intl'
    ? TONGYI_ENDPOINTS.intl
    : TONGYI_ENDPOINTS.cn
}

function assertSafeTongyiImageUrl(url: string): void {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') {
    throw new Error('Tongyi image URL must use HTTPS')
  }
  if (!TONGYI_IMAGE_DOMAINS.some((suffix) => parsed.hostname.endsWith(suffix))) {
    throw new Error(`Tongyi image URL hostname not in allowlist: ${parsed.hostname}`)
  }
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

export const tongyiAdapter: ModelAdapter = {
  definition: {
    id: 'tongyi-wanx2.1',
    label: 'Tongyi Wanx 2.1',
    provider: 'alibaba',
    supportsReferenceImages: true,
  },
  async generate(options: GenerateOptions): Promise<AdapterResult> {
    const apiKey = options.apiKey ?? process.env.DASHSCOPE_API_KEY ?? ''
    const startedAt = Date.now()

    if (!apiKey) {
      return {
        ok: false,
        errorCode: 'misconfigured',
        message: 'DASHSCOPE_API_KEY environment variable is not set',
        durationMs: 0,
      }
    }

    try {
      const response = await fetchJsonWithTimeout<TongyiResponse>(
        getTongyiEndpoint(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.DASHSCOPE_MODEL_ID ?? 'wan2.7-image',
            input: {
              messages: [
                {
                  role: 'user',
                  content: [{ text: options.prompt }],
                },
              ],
            },
            parameters: {
              size: ASPECT_TO_TONGYI_SIZE[options.aspectRatio],
              n: 1,
              watermark: false,
            },
          }),
        },
        {
          timeoutMs: getTimeoutMsFromEnv('DASHSCOPE_IMAGE_TIMEOUT_MS'),
          invalidResponseMessage: 'Tongyi returned invalid JSON',
        }
      )

      const imageUrl = response.output?.choices?.[0]?.message?.content?.find(
        (item) => typeof item.image === 'string'
      )?.image

      if (!imageUrl) {
        return {
          ok: false,
          errorCode: 'invalid_response',
          message: 'Tongyi response did not contain an image URL',
          durationMs: Date.now() - startedAt,
        }
      }

      // Validate image URL domain before fetching (provider-response SSRF prevention)
      assertSafeTongyiImageUrl(imageUrl)

      const image = await fetchBytesWithTimeout(
        imageUrl,
        {},
        { timeoutMs: getTimeoutMsFromEnv('DASHSCOPE_IMAGE_TIMEOUT_MS') }
      )

      return {
        ok: true,
        data: image.data,
        mimeType:
          image.mimeType === 'image/jpeg' ||
          image.mimeType === 'image/webp' ||
          image.mimeType === 'image/png'
            ? image.mimeType
            : 'image/png',
        durationMs: Date.now() - startedAt,
      }
    } catch (error: unknown) {
      return toAdapterError(error, startedAt)
    }
  },
}
