import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_PROTECTED_PREFIXES, DASHBOARD_HOME } from '@/lib/navigation'

const protectedRoutes = [...AUTH_PROTECTED_PREFIXES]
const authRoutes = ['/login', '/signup']

// AUTH BOUNDARY: This middleware only checks cookie *presence* for UX redirects.
// It does NOT verify JWT signature or expiry — that happens in each page handler
// via auth(). Any route that needs real auth MUST call auth() server-side.
// Do not rely on this middleware alone for access control.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const sessionToken =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value

  const isLoggedIn = !!sessionToken

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(DASHBOARD_HOME, req.url))
  }

  // Logged-in users visiting the landing page → dashboard. Keeping this
  // redirect in middleware (instead of app/page.tsx) lets the landing page
  // stay fully static (no cookies() read inside the route handler → Next.js
  // SSG → Vercel edge cache HIT → fast TTFB for anonymous visitors).
  if (pathname === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL(DASHBOARD_HOME, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
