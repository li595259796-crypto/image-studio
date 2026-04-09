export async function triggerWorker(): Promise<void> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.APP_URL ?? 'http://localhost:3000')

  try {
    // We only need to ensure the request reaches Vercel — the worker function
    // will continue running even after we disconnect. Use a short timeout since
    // we don't need to wait for the full processing to complete.
    await fetch(`${base}/api/worker/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}` },
      signal: AbortSignal.timeout(5000),
    })
  } catch (err: unknown) {
    // Timeout is expected (worker processes for minutes), only log unexpected errors
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('abort') && !message.includes('timeout')) {
      console.error('[trigger-worker] Failed to kick worker:', message)
    }
  }
}
