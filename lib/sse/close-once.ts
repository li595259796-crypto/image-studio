/**
 * Close a ReadableStream controller safely, even if called twice.
 *
 * Uses a WeakSet to track already-closed controllers so a caller that
 * independently decides to close (e.g. happy path) and an error handler
 * (fatal branch) don't crash with "Invalid state: Controller is already
 * closed". Also swallows that specific error defensively if the weakset
 * missed a case.
 */
const closed = new WeakSet<object>()

export function closeStreamOnce(
  controller: Pick<ReadableStreamDefaultController, 'close'>
): void {
  if (closed.has(controller)) return
  try {
    controller.close()
    closed.add(controller)
  } catch (error: unknown) {
    if (
      error instanceof TypeError &&
      typeof error.message === 'string' &&
      error.message.includes('already closed')
    ) {
      closed.add(controller)
      return
    }
    throw error
  }
}
