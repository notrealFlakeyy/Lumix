import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'

import { defaultLocale, locales } from './i18n/routing'

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

const isProtectedPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return false

  const rest = `/${parts.slice(1).join('/')}`
  return (
    rest === '/dashboard' ||
    rest.startsWith('/dashboard/') ||
    rest === '/sales' ||
    rest.startsWith('/sales/') ||
    rest === '/purchases' ||
    rest.startsWith('/purchases/') ||
    rest === '/accounting' ||
    rest.startsWith('/accounting/') ||
    rest === '/reporting' ||
    rest.startsWith('/reporting/') ||
    rest === '/payroll' ||
    rest.startsWith('/payroll/') ||
    rest === '/inventory' ||
    rest.startsWith('/inventory/') ||
    rest === '/settings' ||
    rest.startsWith('/settings/')
  )
}

const isAuthPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return false

  const rest = `/${parts.slice(1).join('/')}`
  return rest === '/login' || rest.startsWith('/login/') || rest === '/signup' || rest.startsWith('/signup/')
}

export async function middleware(req: NextRequest) {
  const res = intlMiddleware(req)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return res
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthed = Boolean(user)

  const { pathname } = req.nextUrl
  const parts = pathname.split('/').filter(Boolean)
  const locale = locales.includes(parts[0] as any) ? parts[0] : defaultLocale

  if (isProtectedPath(pathname) && !isAuthed) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = `/${locale}/login`
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthPath(pathname) && isAuthed) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
