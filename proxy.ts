import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/error'
    redirectUrl.searchParams.set('reason', 'auth')
    return NextResponse.redirect(redirectUrl)
  }

  if (!session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!$|signup$|login$|forgot-password$|reset-password$|confirmed$|error$|_next/|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
