import { NextResponse } from 'next/server'

export async function GET() {
  const vercelUrl = process.env.VERCEL_URL ?? '(not set)'
  const appUrl = process.env.APP_URL ?? '(not set)'
  const workerSecret = process.env.WORKER_SECRET ? 'set' : '(not set)'

  const base = process.env.APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // Try to call the worker endpoint
  let triggerResult = ''
  try {
    const resp = await fetch(`${base}/api/worker/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}` },
      signal: AbortSignal.timeout(10000),
    })
    triggerResult = `status=${resp.status}, body=${await resp.text()}`
  } catch (err: unknown) {
    triggerResult = `error: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json({
    vercelUrl,
    appUrl,
    workerSecret,
    triggerBase: base,
    triggerResult,
  })
}
