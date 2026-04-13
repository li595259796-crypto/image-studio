export const DASHBOARD_HOME = '/canvas' as const

export const AUTH_PROTECTED_PREFIXES = [
  '/canvas',
  '/generate',
  '/edit',
  '/gallery',
  '/settings',
  '/upgrade',
] as const

export type WorkbenchRouteKey =
  | 'canvas'
  | 'generate'
  | 'edit'
  | 'gallery'
  | 'settings'
  | 'upgrade'
  | 'default'

export function getWorkbenchRouteKey(pathname: string): WorkbenchRouteKey {
  if (pathname.startsWith('/canvas')) return 'canvas'
  if (pathname.startsWith('/generate')) return 'generate'
  if (pathname.startsWith('/edit')) return 'edit'
  if (pathname.startsWith('/gallery')) return 'gallery'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/upgrade')) return 'upgrade'
  return 'default'
}
