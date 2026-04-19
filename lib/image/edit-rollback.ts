/**
 * Decides if quota should be rolled back after all model runs complete.
 *
 * Rule: if no result produced a usable image (imageId + blobUrl), every
 * attempt failed and the user should not be charged. Returns true for
 * empty results defensively (shouldn't happen in practice — preDeduct
 * runs before we reach this branch — but avoids silently charging on
 * a degenerate path).
 */
export type EditResultShape = {
  imageId?: string
  blobUrl?: string
  errorCode?: string
  [key: string]: unknown
}

export function shouldRollbackAfterLoop(results: readonly EditResultShape[]): boolean {
  if (results.length === 0) return true
  return results.every((r) => !r.imageId || !r.blobUrl)
}
