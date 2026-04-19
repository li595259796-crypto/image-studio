import {
  decodeBase64Image,
  fetchJsonWithTimeout,
  getTimeoutMsFromEnv,
  ImageApiError,
} from '../image-api.ts'
import type { AdapterResult, GenerateOptions, ModelAdapter } from './types.ts'

interface SeedreamResponse {
  data?: Array<{
    b64_json?: string
  }>
}

const DEFAULT_SEEDREAM_MODEL = 'doubao-seedream-4-0-250828'

const ASPECT_TO_SEEDREAM_SIZE: Record<GenerateOptions['aspectRatio'], string> = {
  '1:1': '1024x1024',
  '16:9': '1792x1024',
  '9:16': '1024x1792',
  '4:3': '1365x1024',
  '3:4': '1024x1365',
}

function getSeedreamEndpoint(): string {
  return process.env.VOLCENGINE_REGION === 'intl'
    ? 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations'
    : 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
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

export const seedreamAdapter: ModelAdapter = {
  definition: {
    id: 'seedream-5.0',
    label: 'Seedream 5.0',
    provider: 'bytedance',
    supportsReferenceImages: true,
  },
  async generate(options: GenerateOptions): Promise<AdapterResult> {
    const apiKey = options.apiKey ?? process.env.VOLCENGINE_ARK_API_KEY ?? ''
    const startedAt = Date.now()

    if (!apiKey) {
      return {
        ok: false,
        errorCode: 'misconfigured',
        message: 'VOLCENGINE_ARK_API_KEY environment variable is not set',
        durationMs: 0,
      }
    }

    try {
      const response = await fetchJsonWithTimeout<SeedreamResponse>(
        getSeedreamEndpoint(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.VOLCENGINE_MODEL_ID ?? DEFAULT_SEEDREAM_MODEL,
            prompt: options.prompt,
            size: ASPECT_TO_SEEDREAM_SIZE[options.aspectRatio],
            response_format: 'b64_json',
            watermark: false,
          }),
        },
        {
          timeoutMs: getTimeoutMsFromEnv('VOLCENGINE_IMAGE_TIMEOUT_MS'),
          invalidResponseMessage: 'Seedream returned invalid JSON',
          externalSignal: options.signal,
        }
      )

      const data = response.data?.[0]?.b64_json
      if (!data) {
        return {
          ok: false,
          errorCode: 'invalid_response',
          message: 'Seedream response did not contain image bytes',
          durationMs: Date.now() - startedAt,
        }
      }

      return {
        ok: true,
        data: decodeBase64Image(data),
        mimeType: 'image/png',
        durationMs: Date.now() - startedAt,
      }
    } catch (error: unknown) {
      return toAdapterError(error, startedAt)
    }
  },
}
