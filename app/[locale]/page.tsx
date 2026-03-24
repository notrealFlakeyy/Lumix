import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import type { Membership } from '@/types/app'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { publicEnv } from '@/lib/env/public'
import { getDefaultAuthenticatedHref } from '@/lib/platform/routing'
import { LandingPage } from '@/components/marketing/landing-page'
import { buildAbsoluteUrl, hasDedicatedPortalOrigin, isPortalHostname, normalizeHostname, resolvePortalOrigin } from '@/lib/urls/portal'

export default async function EntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const headerStore = await headers()
  const portalOptions = {
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    portalUrl: publicEnv.NEXT_PUBLIC_PORTAL_URL,
  }
  const hasDedicatedPortal = hasDedicatedPortalOrigin(portalOptions)
  const requestHost = normalizeHostname(headerStore.get('x-forwarded-host') ?? headerStore.get('host'))
  const portalRequest = hasDedicatedPortal && isPortalHostname(requestHost, portalOptions)
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (portalRequest) {
      redirect(buildAbsoluteUrl(resolvePortalOrigin(portalOptions), `/${locale}/login`))
    }

    return <LandingPage locale={locale} />
  }

  const { membership } = await getCurrentMembership()
  if (!membership?.company_id) {
    const nextPath = `/${locale}/onboarding`
    redirect(portalRequest ? nextPath : buildAbsoluteUrl(resolvePortalOrigin(portalOptions), nextPath))
  }

  const resolvedMembership = membership as Membership
  const nextPath = getDefaultAuthenticatedHref(locale, resolvedMembership.role, resolvedMembership.enabledModules)
  redirect(portalRequest ? nextPath : buildAbsoluteUrl(resolvePortalOrigin(portalOptions), nextPath))
}
