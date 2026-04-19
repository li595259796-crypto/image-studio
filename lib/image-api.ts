// Shared utilities for image API adapters (147ai, etc.)
// No DashScope code remains — all generation routes through model adapters.

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
  retries?: number // number of retries on 429 (default 3)
  /**
   * External abort signal from the API route's request.signal. When the
   * client disconnects, this trips and we abandon the upstream call
   * instead of holding the lambda open for up to 300s.
   */
  externalSignal?: AbortSignal
}

export function getTimeoutMsFromEnv(
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
  const maxRetries = options.retries ?? 3

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Fast-fail if the caller already aborted (e.g. client disconnected
    // between retries). Avoids firing another upstream call we'll drop.
    if (options.externalSignal?.aborted) {
      throw new ImageApiError('network', 'Request aborted by caller')
    }

    const controller = new AbortController()
    let didTimeout = false
    const timeoutId = setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, timeoutMs)

    const onExternalAbort = () => controller.abort()
    options.externalSignal?.addEventListener('abort', onExternalAbort, { once: true })

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      if (response.status === 429 && attempt < maxRetries) {
        clearTimeout(timeoutId)
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt)
        console.warn(`[image-api] 429 rate limit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

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
      clearTimeout(timeoutId)
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
      options.externalSignal?.removeEventListener('abort', onExternalAbort)
    }
  }

  // Should not reach here, but satisfy TypeScript
  throw new ImageApiError('network', 'Unexpected fetch loop exit')
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
