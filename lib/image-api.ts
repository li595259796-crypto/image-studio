const DEFAULT_TIMEOUT_MS = 60_000

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

interface ApiMessage {
  role: string
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface ApiResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

function getTimeoutMs(): number {
  const raw = process.env.IMAGE_API_TIMEOUT_MS
  if (!raw) return DEFAULT_TIMEOUT_MS

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

function getApiKey(): string {
  return process.env.IMAGE_API_KEY ?? ''
}

function getApiUrl(): string {
  return process.env.IMAGE_API_URL ?? 'https://147ai.com/v1/chat/completions'
}

function getApiModel(): string {
  return process.env.IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview'
}

function extractImageBuffer(content: string): Buffer {
  const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/)
  if (!match) {
    throw new ImageApiError(
      'invalid_response',
      'Image API response did not contain a base64 image'
    )
  }
  return Buffer.from(match[1], 'base64')
}

async function callApi(messages: ApiMessage[]): Promise<ApiResponse> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new ImageApiError(
      'misconfigured',
      'IMAGE_API_KEY environment variable is not set'
    )
  }

  const timeoutMs = getTimeoutMs()
  const controller = new AbortController()
  let didTimeout = false
  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getApiModel(),
        messages,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      await response.text() // consume body
      throw new ImageApiError(
        'upstream_http',
        `Image API returned status ${response.status}`,
        { status: response.status }
      )
    }

    const data = (await response.json()) as ApiResponse

    if (!data.choices?.[0]?.message?.content) {
      throw new ImageApiError(
        'invalid_response',
        'Image API response missing expected content structure'
      )
    }

    return data
  } catch (error: unknown) {
    if (error instanceof ImageApiError) {
      throw error
    }

    if (
      didTimeout ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
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

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  quality: string
): Promise<Buffer> {
  const userContent = [
    `Generate an image with the following specifications:`,
    `- Prompt: ${prompt}`,
    `- Aspect ratio: ${aspectRatio}`,
    `- Quality: ${quality}`,
  ].join('\n')

  const messages: ApiMessage[] = [
    { role: 'user', content: userContent },
  ]

  const result = await callApi(messages)
  return extractImageBuffer(result.choices[0].message.content)
}

export async function editImage(
  prompt: string,
  imageBuffers: Buffer[]
): Promise<Buffer> {
  const imageContents = imageBuffers.map((buf) => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/png;base64,${buf.toString('base64')}` },
  }))

  const messages: ApiMessage[] = [
    {
      role: 'user',
      content: [
        ...imageContents,
        { type: 'text' as const, text: `Edit this image: ${prompt}` },
      ],
    },
  ]

  const result = await callApi(messages)
  return extractImageBuffer(result.choices[0].message.content)
}
