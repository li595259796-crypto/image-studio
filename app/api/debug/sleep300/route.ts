// TEMP-DIAGNOSIS: Phase 3 — test whether maxDuration>60 is honored. Delete at teardown.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateDebugAuth, parseSleepSeconds } from '@/lib/debug-diagnosis'

// Declared 300 specifically to see whether Hobby enforces it.
export const maxDuration = 300

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url)
  const seconds = parseSleepSeconds(url.searchParams.get('seconds'))

  const start = Date.now()
  await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000))
  const actualMs = Date.now() - start

  return NextResponse.json({
    requested: seconds,
    actualMs,
    maxDurationDeclared: 300,
  })
}
