// TEMP-DIAGNOSIS: Phase 2B isolated bench route. Delete at teardown.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { validateDebugAuth, validateBlobUrl } from '@/lib/debug-diagnosis'
import { editImage } from '@/lib/image-api'

// Matches the real edit page's declared cap so the bench runs under
// identical Vercel limits.
export const maxDuration = 60

interface BenchRequestBody {
  prompt?: unknown
}

interface BenchSample {
  traceId: string
  totalMs: number
  e0ToE2Ms: number
  e2ToE3Ms: number
  e3ToE4Ms: number
  e4ToE5Ms: number
  e5ToE6Ms: number
}

interface BenchResponse {
  fixtureBytes: number | null
  fixtureFetchMs: number | null
  sample: BenchSample | null
  error?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const auth = validateDebugAuth(
    req.headers.get('authorization'),
    process.env.DEBUG_SECRET
  )
  if (!auth.ok) {
    if (auth.status === 503) {
      return new NextResponse(null, { status: 503 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate DEBUG_BENCH_IMAGE_URL (SSRF guard)
  const urlCheck = validateBlobUrl(process.env.DEBUG_BENCH_IMAGE_URL)
  if (!urlCheck.ok) {
    return NextResponse.json(
      { error: `DEBUG_BENCH_IMAGE_URL invalid: ${urlCheck.reason}` },
      { status: 500 }
    )
  }

  // 3. Parse request body (prompt only — no samples param, one call per request)
  let body: BenchRequestBody
  try {
    body = (await req.json()) as BenchRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Request body must be JSON' },
      { status: 400 }
    )
  }
  if (typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    return NextResponse.json(
      { error: 'prompt (non-empty string) is required' },
      { status: 400 }
    )
  }
  const prompt = body.prompt

  // 4. Fetch fixture bytes from Vercel Blob (explicitly timed)
  const fixtureFetchStart = Date.now()
  let fixtureBuffer: Buffer
  let fixtureBytes: number
  let fixtureFetchMs: number
  try {
    const fixtureResp = await fetch(urlCheck.url.toString(), { redirect: 'error' })
    if (!fixtureResp.ok) {
      return NextResponse.json(
        {
          fixtureBytes: null,
          fixtureFetchMs: Date.now() - fixtureFetchStart,
          sample: null,
          error: `Fixture fetch failed with status ${fixtureResp.status}`,
        } satisfies BenchResponse,
        { status: 502 }
      )
    }
    const arrayBuf = await fixtureResp.arrayBuffer()
    fixtureBuffer = Buffer.from(arrayBuf)
    fixtureBytes = fixtureBuffer.length
    fixtureFetchMs = Date.now() - fixtureFetchStart
  } catch (err) {
    return NextResponse.json(
      {
        fixtureBytes: null,
        fixtureFetchMs: Date.now() - fixtureFetchStart,
        sample: null,
        error: `Fixture fetch threw: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies BenchResponse,
      { status: 502 }
    )
  }

  // 5. Run exactly one editImage call with timing captured into timingOut.
  const traceId = randomUUID().slice(0, 8)
  const timingOut: Record<string, number> = {}
  const wallStart = Date.now()
  try {
    await editImage(prompt, [fixtureBuffer], { traceId, timingOut })
  } catch (err) {
    // Report partial timing — fixtureBytes and fixtureFetchMs always present.
    return NextResponse.json(
      {
        fixtureBytes,
        fixtureFetchMs,
        sample: null,
        error: `editImage threw: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies BenchResponse,
      { status: 500 }
    )
  }
  const totalMs = Date.now() - wallStart

  // 6. Compute delta windows from the cumulative-from-t0 timingOut map.
  const sample: BenchSample = {
    traceId,
    totalMs,
    e0ToE2Ms: (timingOut.e2 ?? 0) - (timingOut.e0 ?? 0),
    e2ToE3Ms: (timingOut.e3 ?? 0) - (timingOut.e2 ?? 0),
    e3ToE4Ms: (timingOut.e4 ?? 0) - (timingOut.e3 ?? 0),
    e4ToE5Ms: (timingOut.e5 ?? 0) - (timingOut.e4 ?? 0),
    e5ToE6Ms: (timingOut.e6 ?? 0) - (timingOut.e5 ?? 0),
  }

  return NextResponse.json(
    { fixtureBytes, fixtureFetchMs, sample } satisfies BenchResponse
  )
}
