export function triggerWorker(): void {
  // Prefer VERCEL_URL for internal calls (custom domain may not resolve inside Vercel network)
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.APP_URL ?? 'http://localhost:3000')

  fetch(`${base}/api/worker/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}` },
    signal: AbortSignal.timeout(5000),
  }).catch((err: unknown) => {
    console.error('[trigger-worker] Failed to kick worker:', err instanceof Error ? err.message : err)
  })
}
