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
