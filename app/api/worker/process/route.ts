// FROZEN (P4 async rollback): worker route kept for future re-activation.
// After the sync rollback on 2026-04-10 no client code triggers this route,
// so it will always return {processed: 0} unless called manually with WORKER_SECRET.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runWorkerLoop } from '@/lib/task-worker'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.WORKER_SECRET ?? ''}`

  if (!process.env.WORKER_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const processed = await runWorkerLoop({ maxTasks: 3, maxDurationMs: 4 * 60 * 1000 })

  return NextResponse.json({ processed })
}
