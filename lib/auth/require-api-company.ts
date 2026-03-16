import type { Membership } from '@/types/app'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'

export async function requireApiCompany() {
  const context = await getCurrentMembership()

  if (!context.user || !context.membership?.company_id) {
    return null
  }

  return {
    supabase: context.supabase,
    user: context.user,
    membership: context.membership as Membership,
    memberships: context.memberships,
  }
}
