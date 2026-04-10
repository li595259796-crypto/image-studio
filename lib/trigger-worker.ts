export async function triggerWorker(): Promise<void> {
  // Use APP_URL (custom domain) — VERCEL_URL points to preview deployments
  // which are behind Vercel Authentication and will reject requests with 401
  const base = process.env.APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  if (!process.env.WORKER_SECRET) {
    console.error('[trigger-worker] Failed to kick worker:', 'WORKER_SECRET is not configured')
    return
  }

  try {
    const response = await fetch(`${base}/api/worker/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WORKER_SECRET}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(
        '[trigger-worker] Failed to kick worker:',
        `status ${response.status}`,
        body.slice(0, 200)
      )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('abort') && !message.includes('timeout')) {
      console.error('[trigger-worker] Failed to kick worker:', message)
    }
  }
}
