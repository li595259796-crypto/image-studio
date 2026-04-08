import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/generate'
  const origin = new URL(request.url).origin
  const redirectUrl = new URL(rawNext, request.url)
  const safeRedirect = redirectUrl.origin === origin ? redirectUrl : new URL('/generate', request.url)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(safeRedirect)
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
