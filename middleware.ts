import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'

import { defaultLocale, locales } from './i18n/routing'
import { activeCompanyCookieName } from './lib/auth/constants'
import { publicEnv } from './lib/env/public'
import { canAccessModule } from './lib/auth/permissions'
import { defaultEnabledPlatformModules, normalizeEnabledPlatformModules } from './lib/platform/modules'
import { getAppModuleForRouteSegment, getDefaultAuthenticatedHref, isProtectedRouteSegment } from './lib/platform/routing'
import { buildAbsoluteUrl, hasDedicatedPortalOrigin, isPortalHostname, normalizeHostname, resolvePortalOrigin } from './lib/urls/portal'
import type { CompanyRole } from './types/app'

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

const pathModule = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return null
  return getAppModuleForRouteSegment(parts[1])
}

const isProtectedPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return false
  return isProtectedRouteSegment(parts[1])
}

const isAuthPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  const maybeLocale = parts[0]
  if (!maybeLocale || !locales.includes(maybeLocale as any)) return false

  const rest = `/${parts.slice(1).join('/')}`
  return rest === '/login' || rest.startsWith('/login/') || rest === '/signup' || rest.startsWith('/signup/')
}

const isLocaleRootPath = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean)
  return parts.length === 1 && locales.includes(parts[0] as (typeof locales)[number])
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
  const portalOptions = {
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    portalUrl: publicEnv.NEXT_PUBLIC_PORTAL_URL,
    fallbackOrigin: req.nextUrl.origin,
  }
  const hasDedicatedPortal = hasDedicatedPortalOrigin(portalOptions)
  const requestHost = normalizeHostname(req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host)
  const portalRequest = hasDedicatedPortal && isPortalHostname(requestHost, portalOptions)
  const redirectToPortal = (nextPathname: string, search = '') =>
    NextResponse.redirect(buildAbsoluteUrl(resolvePortalOrigin(portalOptions), nextPathname, search))

  let role: CompanyRole | null = null
  let enabledModules = [...defaultEnabledPlatformModules]
  if (user) {
    const activeCompanyId = req.cookies.get(activeCompanyCookieName)?.value
    const { data: memberships } = await supabase
      .from('company_users')
      .select('company_id, role, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    const membership =
      memberships?.find((item) => item.company_id === activeCompanyId) ??
      memberships?.[0] ??
      null

    if (membership?.company_id) {
      role = membership.role as CompanyRole

      const { data: companyModules } = await supabase
        .from('company_modules')
        .select('module_key, is_enabled')
        .eq('company_id', membership.company_id)

      enabledModules = normalizeEnabledPlatformModules(
        companyModules?.filter((item) => item.is_enabled).map((item) => item.module_key) ?? defaultEnabledPlatformModules,
      )
    }
  }

  if (hasDedicatedPortal) {
    if (!portalRequest) {
      if (isProtectedPath(pathname)) {
        return redirectToPortal(pathname, req.nextUrl.search)
      }

      if (isAuthPath(pathname)) {
        const target = isAuthed ? (role ? getDefaultAuthenticatedHref(locale, role, enabledModules) : `/${locale}/onboarding`) : pathname
        return redirectToPortal(target, isAuthed ? '' : req.nextUrl.search)
      }

      if (isLocaleRootPath(pathname) && isAuthed) {
        const target = role ? getDefaultAuthenticatedHref(locale, role, enabledModules) : `/${locale}/onboarding`
        return redirectToPortal(target)
      }
    } else {
      if (pathname === '/') {
        const target = isAuthed ? (role ? getDefaultAuthenticatedHref(defaultLocale, role, enabledModules) : `/${defaultLocale}/onboarding`) : `/${defaultLocale}/login`
        return redirectToPortal(target)
      }

      if (isLocaleRootPath(pathname)) {
        const target = isAuthed ? (role ? getDefaultAuthenticatedHref(locale, role, enabledModules) : `/${locale}/onboarding`) : `/${locale}/login`
        return redirectToPortal(target)
      }
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
    redirectUrl.pathname = role ? getDefaultAuthenticatedHref(locale, role, enabledModules) : `/${locale}/onboarding`
    return NextResponse.redirect(redirectUrl)
  }

  if (isProtectedPath(pathname) && isAuthed && !role) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = `/${locale}/onboarding`
    return NextResponse.redirect(redirectUrl)
  }

  if (isProtectedPath(pathname) && isAuthed && role) {
    const mod = pathModule(pathname)
    if (mod && !canAccessModule(role, mod, enabledModules)) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = getDefaultAuthenticatedHref(locale, role, enabledModules)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
