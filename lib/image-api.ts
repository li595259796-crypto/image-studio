const API_KEY = process.env.IMAGE_API_KEY ?? ''
const API_URL =
  process.env.IMAGE_API_URL ?? 'https://147ai.com/v1/chat/completions'
const MODEL = process.env.IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview'
const TIMEOUT_MS = 300_000

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

function extractImageBuffer(content: string): Buffer {
  const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/)
  if (!match) {
    throw new Error('No image found in API response')
  }
  return Buffer.from(match[1], 'base64')
}

async function callApi(messages: ApiMessage[]): Promise<ApiResponse> {
  if (!API_KEY) {
    throw new Error('IMAGE_API_KEY environment variable is not set')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Image generation failed (status ${response.status})`)
    }

    const data = (await response.json()) as ApiResponse

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('API response missing expected content structure')
    }

    return data
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
