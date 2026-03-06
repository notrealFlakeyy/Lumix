import { redirect } from 'next/navigation'

import type { Membership } from '@/types/app'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'

export async function requireCompany(locale: string) {
  const context = await getCurrentMembership()

  if (!context.user) {
    redirect(`/${locale}/login`)
  }

  if (!context.membership?.company_id) {
    redirect(`/${locale}/onboarding`)
  }

  return {
    supabase: context.supabase,
    user: context.user,
    membership: context.membership as Membership,
  }
}
