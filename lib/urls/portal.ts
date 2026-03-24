type PortalUrlOptions = {
  siteUrl?: string | null
  portalUrl?: string | null
  fallbackOrigin?: string | null
}

function safeOrigin(value?: string | null) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function safeUrl(value?: string | null) {
  const origin = safeOrigin(value)
  return origin ? new URL(origin) : null
}

export function normalizeHostname(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replace(/:\d+$/, '')
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

function derivePublicOriginFromPortal(portalOrigin: string) {
  const parsed = new URL(portalOrigin)
  if (parsed.hostname.startsWith('portal.')) {
    parsed.hostname = parsed.hostname.slice('portal.'.length)
  }
  return parsed.origin
}

export function resolvePublicOrigin({ siteUrl, portalUrl, fallbackOrigin }: PortalUrlOptions) {
  const siteOrigin = safeOrigin(siteUrl)
  if (siteOrigin) return siteOrigin

  const explicitPortalOrigin = safeOrigin(portalUrl)
  if (explicitPortalOrigin) {
    return derivePublicOriginFromPortal(explicitPortalOrigin)
  }

  return safeOrigin(fallbackOrigin) ?? 'http://localhost:3000'
}

export function resolvePortalOrigin({ siteUrl, portalUrl, fallbackOrigin }: PortalUrlOptions) {
  const explicitPortalOrigin = safeOrigin(portalUrl)
  if (explicitPortalOrigin) return explicitPortalOrigin

  if (!siteUrl) {
    return safeOrigin(fallbackOrigin) ?? 'http://localhost:3000'
  }

  const publicOrigin = resolvePublicOrigin({ siteUrl, portalUrl, fallbackOrigin })
  const parsed = new URL(publicOrigin)

  if (isLocalHostname(parsed.hostname)) {
    return parsed.origin
  }

  if (!parsed.hostname.startsWith('portal.')) {
    parsed.hostname = `portal.${parsed.hostname.replace(/^www\./, '')}`
  }

  return parsed.origin
}

export function hasDedicatedPortalOrigin(options: PortalUrlOptions) {
  return normalizeHostname(new URL(resolvePortalOrigin(options)).host) !== normalizeHostname(new URL(resolvePublicOrigin(options)).host)
}

export function isPortalHostname(hostname: string, options: PortalUrlOptions) {
  return normalizeHostname(hostname) === normalizeHostname(new URL(resolvePortalOrigin(options)).host)
}

export function buildAbsoluteUrl(origin: string, pathname: string, search = '') {
  const url = new URL(pathname, origin)
  if (search) {
    url.search = search.startsWith('?') ? search.slice(1) : search
  }
  return url.toString()
}

export function getPortalLoginUrl(locale: string, options: PortalUrlOptions) {
  return buildAbsoluteUrl(resolvePortalOrigin(options), `/${locale}/login`)
}

export function getPortalSignupUrl(locale: string, options: PortalUrlOptions) {
  return buildAbsoluteUrl(resolvePortalOrigin(options), `/${locale}/signup`)
}

export function getPublicLocaleUrl(locale: string, options: PortalUrlOptions) {
  return buildAbsoluteUrl(resolvePublicOrigin(options), `/${locale}`)
}

export function getPortalDashboardUrl(locale: string, options: PortalUrlOptions) {
  return buildAbsoluteUrl(resolvePortalOrigin(options), `/${locale}/dashboard`)
}

export function getPortalPlansUrl(locale: string, options: PortalUrlOptions) {
  return buildAbsoluteUrl(resolvePortalOrigin(options), `/${locale}/plans`)
}

export function getPortalForgotPasswordUrl(options: PortalUrlOptions) {
  return buildAbsoluteUrl(resolvePortalOrigin(options), '/forgot-password')
}

export function getPortalConfigFromPublicEnv() {
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL,
  }
}
