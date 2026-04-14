const DEFAULT_TIMEOUT_MS = 180_000

export type ImageApiErrorKind =
  | 'misconfigured'
  | 'timeout'
  | 'upstream_http'
  | 'invalid_response'
  | 'network'

interface ImageApiErrorOptions {
  status?: number
  cause?: unknown
}

export class ImageApiError extends Error {
  kind: ImageApiErrorKind
  status?: number

  constructor(
    kind: ImageApiErrorKind,
    message: string,
    options: ImageApiErrorOptions = {}
  ) {
    super(message)
    this.name = 'ImageApiError'
    this.kind = kind
    this.status = options.status

    if ('cause' in Error.prototype || options.cause !== undefined) {
      Object.assign(this, { cause: options.cause })
    }
  }
}

interface TimedFetchOptions {
  timeoutMs?: number
  invalidResponseMessage?: string
}

function getTimeoutMsFromEnv(
  envVarName = 'IMAGE_API_TIMEOUT_MS',
  fallback = DEFAULT_TIMEOUT_MS
): number {
  const raw = process.env[envVarName]
  if (!raw) return fallback

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  options: TimedFetchOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? getTimeoutMsFromEnv()
  const controller = new AbortController()
  let didTimeout = false
  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[image-api] HTTP ${response.status} from ${input}:`, errorBody)
      throw new ImageApiError(
        'upstream_http',
        `Image API returned status ${response.status}: ${errorBody.slice(0, 200)}`,
        { status: response.status }
      )
    }

    return response
  } catch (error: unknown) {
    if (error instanceof ImageApiError) {
      throw error
    }

    if (didTimeout || (error instanceof Error && error.name === 'AbortError')) {
      throw new ImageApiError(
        'timeout',
        `Image API request timed out after ${timeoutMs}ms`,
        { cause: error }
      )
    }

    if (error instanceof Error) {
      throw new ImageApiError(
        'network',
        `Image API request failed: ${error.message}`,
        { cause: error }
      )
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchJsonWithTimeout<T>(
  input: string,
  init: RequestInit,
  options: TimedFetchOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(input, init, options)

  try {
    return (await response.json()) as T
  } catch (error: unknown) {
    throw new ImageApiError(
      'invalid_response',
      options.invalidResponseMessage ?? 'Image API returned invalid JSON',
      { cause: error }
    )
  }
}

export async function fetchBytesWithTimeout(
  input: string,
  init: RequestInit = {},
  options: TimedFetchOptions = {}
): Promise<{ data: Uint8Array; mimeType: string | null }> {
  const response = await fetchWithTimeout(input, init, options)
  const data = new Uint8Array(await response.arrayBuffer())

  return {
    data,
    mimeType: response.headers.get('content-type'),
  }
}

export function decodeBase64Image(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, 'base64'))
}

export function extractImageBytes(content: string): Uint8Array {
  const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/)
  if (!match) {
    throw new ImageApiError(
      'invalid_response',
      'Image API response did not contain a base64 image'
    )
  }

  return decodeBase64Image(match[1])
}

// ============================================================
// DashScope (Alibaba Bailian) — direct API for wan2.7-image
// ============================================================

const DASHSCOPE_ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

const DASHSCOPE_SIZE_MAP: Record<string, string> = {
  '1:1': '1280*1280',
  '16:9': '1376*768',
  '9:16': '768*1376',
  '4:3': '1365*1024',
  '3:4': '1024*1365',
}

const DASHSCOPE_IMAGE_HOST_SUFFIXES = ['.aliyuncs.com', '.alicdn.com']

interface DashscopeContentPart {
  image?: string
  text?: string
  type?: string
}

interface DashscopeResponse {
  output?: {
    choices?: Array<{
      message?: {
        content?: DashscopeContentPart[]
      }
    }>
  }
}

function assertSafeDashscopeImageUrl(url: string): void {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') {
    throw new ImageApiError('invalid_response', 'Image URL must use HTTPS')
  }
  if (!DASHSCOPE_IMAGE_HOST_SUFFIXES.some((s) => parsed.hostname.endsWith(s))) {
    throw new ImageApiError(
      'invalid_response',
      `Unexpected image URL host: ${parsed.hostname}`
    )
  }
}

async function callDashscope(
  prompt: string,
  aspectRatio: string,
  referenceImages: Array<{ buffer: Buffer; mimeType?: string }> = []
): Promise<Buffer> {
  const apiKey = process.env.DASHSCOPE_API_KEY ?? ''
  if (!apiKey) {
    throw new ImageApiError(
      'misconfigured',
      'DASHSCOPE_API_KEY environment variable is not set'
    )
  }

  const content: DashscopeContentPart[] = []
  for (const img of referenceImages) {
    const mime = img.mimeType ?? 'image/png'
    content.push({
      image: `data:${mime};base64,${img.buffer.toString('base64')}`,
    })
  }
  content.push({ text: prompt })

  const model = process.env.DASHSCOPE_MODEL_ID ?? 'wan2.7-image'
  const size = DASHSCOPE_SIZE_MAP[aspectRatio] ?? '1280*1280'

  const data = await fetchJsonWithTimeout<DashscopeResponse>(
    DASHSCOPE_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: { messages: [{ role: 'user', content }] },
        parameters: { size, n: 1, watermark: false },
      }),
    },
    {
      timeoutMs: getTimeoutMsFromEnv('DASHSCOPE_IMAGE_TIMEOUT_MS'),
      invalidResponseMessage: 'DashScope returned invalid JSON',
    }
  )

  const imageUrl = data.output?.choices?.[0]?.message?.content?.find(
    (item) => typeof item.image === 'string'
  )?.image

  if (!imageUrl) {
    throw new ImageApiError(
      'invalid_response',
      'DashScope response did not contain an image URL'
    )
  }

  assertSafeDashscopeImageUrl(imageUrl)

  const image = await fetchBytesWithTimeout(
    imageUrl,
    {},
    { timeoutMs: getTimeoutMsFromEnv('DASHSCOPE_IMAGE_TIMEOUT_MS') }
  )

  return Buffer.from(image.data)
}

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  _quality: string
): Promise<Buffer> {
  return callDashscope(prompt, aspectRatio)
}

export async function editImage(
  prompt: string,
  imageBuffers: Buffer[]
): Promise<Buffer> {
  const references = imageBuffers.map((buffer) => ({ buffer }))
  return callDashscope(`Edit this image: ${prompt}`, '1:1', references)
}

export { getTimeoutMsFromEnv }
