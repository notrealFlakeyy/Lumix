import { getCurrentMembership } from '@/lib/auth/get-current-membership'

export async function getCurrentCompany() {
  const { membership } = await getCurrentMembership()
  return membership?.company ?? null
}
