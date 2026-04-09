import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { runWorkerLoop } from '@/lib/task-worker'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.WORKER_SECRET ?? ''}`

  if (!process.env.WORKER_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Return immediately, process tasks in background via after()
  // The route's maxDuration (300s) applies to the after() callback
  after(async () => {
    await runWorkerLoop({ maxTasks: 3, maxDurationMs: 4 * 60 * 1000 })
  })

  return NextResponse.json({ accepted: true })
}
