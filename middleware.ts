import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_PROTECTED_PREFIXES, DASHBOARD_HOME } from '@/lib/navigation'

const protectedRoutes = [...AUTH_PROTECTED_PREFIXES]
const authRoutes = ['/login', '/signup']

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
