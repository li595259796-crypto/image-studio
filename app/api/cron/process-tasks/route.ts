// FROZEN (P4 async rollback): cron route kept for future re-activation.
// No vercel.json cron schedule exists, so this route is never auto-invoked
// after the sync rollback on 2026-04-10.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runWorkerLoop } from '@/lib/task-worker'
import { recoverZombieTasks } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recovered = await recoverZombieTasks()
  const processed = await runWorkerLoop({ maxTasks: 3, maxDurationMs: 4 * 60 * 1000 })

  return NextResponse.json({ recovered, processed })
}
