import { redirect } from 'next/navigation'

import type { Membership } from '@/types/app'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { getDefaultAuthenticatedHref } from '@/lib/platform/routing'
import { LandingPage } from '@/components/marketing/landing-page'

export default async function EntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage locale={locale} />
  }

  const { membership } = await getCurrentMembership()
  if (!membership?.company_id) {
    redirect(`/${locale}/onboarding`)
  }

  const resolvedMembership = membership as Membership
  redirect(getDefaultAuthenticatedHref(locale, resolvedMembership.role, resolvedMembership.enabledModules))
}
