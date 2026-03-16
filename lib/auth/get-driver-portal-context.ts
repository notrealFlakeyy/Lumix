import { redirect } from 'next/navigation'

import { getCurrentDriver } from '@/lib/auth/get-current-driver'
import { canUseDriverWorkflow } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'

export async function getDriverPortalContext(locale: string, previewDriverId?: string) {
  const { supabase, user, membership } = await requireCompany(locale)

  if (!canUseDriverWorkflow(membership.role) || !membership.enabledModules.includes('transport')) {
    redirect(`/${locale}/dashboard`)
  }

  const { data: activeDrivers } = await supabase
    .from('drivers')
    .select('id, public_id, auth_user_id, full_name, email, phone, is_active')
    .eq('company_id', membership.company_id)
    .eq('is_active', true)
    .order('full_name')

  const matchedDriver = await getCurrentDriver(membership.company_id, user.id, user.email, supabase)
  const previewDriver = previewDriverId
    ? (activeDrivers ?? []).find((driver) => driver.public_id === previewDriverId || driver.id === previewDriverId) ?? null
    : null
  const activeDriver = membership.role === 'driver' ? matchedDriver : previewDriver ?? matchedDriver

  return {
    supabase,
    user,
    membership,
    activeDrivers: activeDrivers ?? [],
    matchedDriver,
    activeDriver,
    isPreviewMode: membership.role !== 'driver' && Boolean(previewDriver),
    previewDriverId: previewDriver?.public_id ?? previewDriver?.id ?? null,
  }
}
