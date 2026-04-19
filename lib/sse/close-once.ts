/**
 * Close a ReadableStream controller safely, even if called twice.
 *
 * Uses a WeakSet to track already-closed controllers so a caller that
 * independently decides to close (e.g. happy path) and an error handler
 * (fatal branch) don't crash.
 *
 * Additionally swallows any "already closed" / "errored" / invalid-state
 * error: controller state errors are idempotent from our perspective —
 * the stream is done, which is the whole point. Rethrowing would turn a
 * benign race (client disconnected + our error handler) into an unhandled
 * rejection that Vercel logs as a 500 and leaves the lambda running.
 */
const closed = new WeakSet<object>()

function isBenignStateError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (typeof error.message !== 'string') return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('already closed') ||
    msg.includes('already errored') ||
    msg.includes('controller is closed') ||
    msg.includes('invalid state') ||
    msg.includes('readablestream is closed')
  )
}

export function closeStreamOnce(
  controller: Pick<ReadableStreamDefaultController, 'close'>
): void {
  if (closed.has(controller)) return
  try {
    controller.close()
    closed.add(controller)
  } catch (error: unknown) {
    if (isBenignStateError(error)) {
      closed.add(controller)
      return
    }
    throw error
  }
}
