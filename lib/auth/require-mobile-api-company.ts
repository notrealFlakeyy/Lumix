import type { Membership } from '@/types/app'

import { getRequestMembership } from '@/lib/auth/get-request-membership'

export async function requireMobileApiCompany(request: Request) {
  const context = await getRequestMembership(request)

  if (!context.user || !context.membership?.company_id) {
    return null
  }

  return {
    supabase: context.supabase,
    user: context.user,
    membership: context.membership as Membership,
    memberships: context.memberships,
    accessToken: context.accessToken,
  }
}
