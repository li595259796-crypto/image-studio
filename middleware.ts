import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const protectedRoutes = ['/generate', '/edit', '/gallery']
const authRoutes = ['/login', '/signup']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Skip root path — let page.tsx handle it
  if (nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  const isProtected = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/generate', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
