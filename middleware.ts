import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'

import { defaultLocale, locales } from './i18n/routing'
import { publicEnv } from './lib/env/public'
import { canAccessModule, getAllowedModules } from './lib/auth/permissions'
import type { AppModule, CompanyRole } from './types/app'

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

const pathModule = (pathname: string): AppModule | null => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return null
  const mod = parts[1]
  if (!mod) return null
  return ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'settings'].includes(mod)
    ? (mod as AppModule)
    : null
}

const isProtectedPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return false

  const rest = `/${parts.slice(1).join('/')}`
  return (
    rest === '/dashboard' ||
    rest.startsWith('/dashboard/') ||
    rest === '/customers' ||
    rest.startsWith('/customers/') ||
    rest === '/vehicles' ||
    rest.startsWith('/vehicles/') ||
    rest === '/drivers' ||
    rest.startsWith('/drivers/') ||
    rest === '/orders' ||
    rest.startsWith('/orders/') ||
    rest === '/trips' ||
    rest.startsWith('/trips/') ||
    rest === '/invoices' ||
    rest.startsWith('/invoices/') ||
    rest === '/reports' ||
    rest.startsWith('/reports/') ||
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

  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

  let role: CompanyRole | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('company_users')
      .select('company_id, role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (membership) {
      role = membership.role as CompanyRole
    }
  }

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

  if (isProtectedPath(pathname) && isAuthed && role) {
    const mod = pathModule(pathname)
    if (mod && !canAccessModule(role, mod)) {
      const redirectUrl = req.nextUrl.clone()
      const fallback = getAllowedModules(role)[0] ?? 'dashboard'
      redirectUrl.pathname = `/${locale}/${fallback}`
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
