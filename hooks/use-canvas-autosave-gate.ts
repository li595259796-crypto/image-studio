/**
 * Decides whether queueSave should flip the visible status to 'saving'.
 *
 * Rule: only transition from idle/saved/error → saving. If a save is
 * already in flight, the badge should stay at 'saving' — flipping it
 * every onChange tick causes re-render storm + visually looks stuck.
 */
export function shouldFlipToSaving(currentlyInFlight: boolean): boolean {
  return !currentlyInFlight
}

/**
 * Decides whether the save loop should automatically re-enter queueSave
 * after a save attempt finishes.
 *
 * Only auto-retry on SUCCESS when new changes arrived during the save.
 * On ERROR we never auto-retry: without backoff, a failing save (e.g. DB
 * pool exhausted) would re-fire every tick, hold connections, and cascade
 * into a site-wide hang. User can retry by editing again.
 */
export function shouldAutoRetryAfterSave(opts: {
  succeeded: boolean
  dirty: boolean
  hasPendingState: boolean
}): boolean {
  return opts.succeeded && opts.dirty && opts.hasPendingState
}
