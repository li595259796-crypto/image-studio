export function triggerWorker(): void {
  const base = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  fetch(`${base}/api/worker/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}` },
    signal: AbortSignal.timeout(1000),
  }).catch(() => {
    // Silent: cron or poll-time re-kick will handle it
  })
}
