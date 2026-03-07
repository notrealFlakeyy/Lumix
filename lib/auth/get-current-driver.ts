import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null
}

export async function getCurrentDriver(companyId: string, userId: string, userEmail?: string | null, client?: DbClient) {
  const supabase = await getDbClient(client)

  const [{ data: profile }, { data: drivers }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase
      .from('drivers')
      .select('id, company_id, full_name, phone, email, license_type, employment_type, is_active, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true),
  ])

  const typedDrivers = (drivers ?? []) as TableRow<'drivers'>[]
  const email = normalize(userEmail)
  const fullName = normalize(profile?.full_name ?? null)

  return (
    typedDrivers.find((driver) => email && normalize(driver.email) === email) ??
    typedDrivers.find((driver) => fullName && normalize(driver.full_name) === fullName) ??
    null
  )
}
