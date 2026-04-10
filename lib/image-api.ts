// TEMP-DIAGNOSIS: randomUUID used for default traceId generation. Remove at teardown.
import { randomUUID } from 'node:crypto'

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
      await response.text() // consume body
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

// TEMP-DIAGNOSIS: editImage() is instrumented with E0..E6 timing points.
// Inlined the fetch (rather than reusing callApi()) so generateImage() stays
// completely untouched. Revert this function to its pre-diagnosis form at
// teardown — the source of truth is whatever commit sits immediately before
// this task's commit on the current branch.
export async function editImage(
  prompt: string,
  imageBuffers: Buffer[],
  opts?: { traceId?: string; timingOut?: Record<string, number> } // TEMP-DIAGNOSIS
): Promise<Buffer> {
  // TEMP-DIAGNOSIS: E0 invoked
  const traceId = opts?.traceId ?? randomUUID().slice(0, 8)
  const timingOut = opts?.timingOut
  const t0 = Date.now()
  const totalInputBytes = imageBuffers.reduce((s, b) => s + b.length, 0)
  console.error(
    `[bench-phase1] ${traceId} E0 invoked prompt.length=${prompt.length} buffers=${imageBuffers.length} totalBytes=${totalInputBytes}`
  )
  if (timingOut) timingOut.e0 = 0

  // TEMP-DIAGNOSIS: E1 encode start
  const t1 = Date.now()
  console.error(`[bench-phase1] ${traceId} E1 encode start`)
  if (timingOut) timingOut.e1 = t1 - t0

  const imageContents = imageBuffers.map((buf) => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/png;base64,${buf.toString('base64')}` },
  }))

  // TEMP-DIAGNOSIS: E2 encode done
  const t2 = Date.now()
  const base64Length = imageContents.reduce((s, c) => s + c.image_url.url.length, 0)
  console.error(
    `[bench-phase1] ${traceId} E2 encode done +${t2 - t1}ms base64Length=${base64Length}`
  )
  if (timingOut) timingOut.e2 = t2 - t0

  const messages: ApiMessage[] = [
    {
      role: 'user',
      content: [
        ...imageContents,
        { type: 'text' as const, text: `Edit this image: ${prompt}` },
      ],
    },
  ]

  if (!API_KEY) {
    throw new Error('IMAGE_API_KEY environment variable is not set')
  }

  // TEMP-DIAGNOSIS: E3 fetch start
  const t3 = Date.now()
  const apiHost = new URL(API_URL).host
  console.error(
    `[bench-phase1] ${traceId} E3 fetch start host=${apiHost} model=${MODEL}`
  )
  if (timingOut) timingOut.e3 = t3 - t0

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

    // TEMP-DIAGNOSIS: E4 headers received
    const t4 = Date.now()
    console.error(
      `[bench-phase1] ${traceId} E4 headers received status=${response.status} +${t4 - t3}ms`
    )
    if (timingOut) timingOut.e4 = t4 - t0

    if (!response.ok) {
      await response.text() // consume body
      throw new Error(`Image generation failed (status ${response.status})`)
    }

    // Read the body as raw text FIRST so E4->E5 measures pure network body
    // download time. If we did `await response.json()` here, the JSON parse
    // cost (which is CPU-bound and can be O(hundreds of ms) on a multi-MB
    // base64 payload) would be silently folded into E4->E5 and the Decision
    // Matrix row "E5->E6 dominates = JSON/buffer parse hang" would never
    // match reality. Keeping body-read and parse in different phases is the
    // whole reason this diagnosis exists.
    const responseText = await response.text()

    // TEMP-DIAGNOSIS: E5 body read done (pure network body download)
    const t5 = Date.now()
    console.error(
      `[bench-phase1] ${traceId} E5 body read done +${t5 - t4}ms payloadBytes=${responseText.length}`
    )
    if (timingOut) timingOut.e5 = t5 - t0

    const data = JSON.parse(responseText) as ApiResponse

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('API response missing expected content structure')
    }

    const buffer = extractImageBuffer(data.choices[0].message.content)

    // TEMP-DIAGNOSIS: E6 json parsed + buffer extracted (pure CPU work)
    const t6 = Date.now()
    console.error(
      `[bench-phase1] ${traceId} E6 json parsed + buffer extracted +${t6 - t5}ms resultBytes=${buffer.length} total=${t6 - t0}ms`
    )
    if (timingOut) timingOut.e6 = t6 - t0

    return buffer
  } finally {
    clearTimeout(timeoutId)
  }
}
