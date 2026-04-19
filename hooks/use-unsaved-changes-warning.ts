'use client'

import { useEffect } from 'react'

export interface UnsavedState {
  hasFiles: boolean
  wasSubmitted: boolean
}

export function shouldWarnOnUnload(state: UnsavedState): boolean {
  return state.hasFiles && !state.wasSubmitted
}

/**
 * Registers a beforeunload handler that prevents the user from
 * accidentally navigating away from a form that has unsubmitted uploads.
 *
 * Only covers full-page navigations (tab close, refresh, external link).
 * Next.js `<Link>` client-side navigation does NOT trigger beforeunload;
 * that requires router-level interception and is out of scope for this fix.
 */
export function useUnsavedChangesWarning(state: UnsavedState) {
  const shouldWarn = shouldWarnOnUnload(state)

  useEffect(() => {
    if (!shouldWarn) return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Chrome requires returnValue assignment; modern browsers show
      // their own generic message regardless of what we set.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldWarn])
}
