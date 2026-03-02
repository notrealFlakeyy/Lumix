import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'

import { defaultLocale, locales } from './i18n/routing'
import { publicEnv } from './lib/env/public'
import { allModules, computeAllowedModules, defaultModuleFor, type AppModule } from './lib/auth/member-access'

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
  return (allModules as readonly string[]).includes(mod) ? (mod as AppModule) : null
}

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
    rest === '/time' ||
    rest.startsWith('/time/') ||
    rest === '/settings' ||
    rest.startsWith('/settings/')
  )
}

const isAuthPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return false

  const rest = `/${parts.slice(1).join('/')}`
  return rest === '/login' || rest.startsWith('/login/')
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

  let allowedModules: AppModule[] | null = null
  if (user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, role, allowed_modules')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membership) {
      allowedModules = computeAllowedModules(membership.role as string, (membership as any).allowed_modules)
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
    redirectUrl.pathname = `/${locale}/${defaultModuleFor(allowedModules ?? ['dashboard'])}`
    return NextResponse.redirect(redirectUrl)
  }

  if (isProtectedPath(pathname) && isAuthed && allowedModules) {
    const mod = pathModule(pathname)
    if (mod && !allowedModules.includes(mod)) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = `/${locale}/${defaultModuleFor(allowedModules)}`
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
