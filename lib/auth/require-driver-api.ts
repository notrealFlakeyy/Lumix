import type { TableRow } from '@/types/database'

import { requireApiCompany } from '@/lib/auth/require-api-company'
import { getCurrentDriver } from '@/lib/auth/get-current-driver'
import { canUseDriverWorkflow } from '@/lib/auth/permissions'

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null
}

async function resolveCurrentWorkforceEmployee(
  companyId: string,
  userId: string,
  driver: Pick<TableRow<'drivers'>, 'auth_user_id' | 'email' | 'full_name'> | null,
  supabase: NonNullable<Awaited<ReturnType<typeof requireApiCompany>>>['supabase'],
) {
  const { data: employees, error } = await supabase
    .from('workforce_employees')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  const employeeRows = (employees ?? []) as TableRow<'workforce_employees'>[]
  const driverEmail = normalize(driver?.email ?? null)
  const driverName = normalize(driver?.full_name ?? null)

  return (
    employeeRows.find((employee) => employee.auth_user_id === userId) ??
    employeeRows.find((employee) => driver?.auth_user_id && employee.auth_user_id === driver.auth_user_id) ??
    employeeRows.find((employee) => driverEmail && normalize(employee.email) === driverEmail) ??
    employeeRows.find((employee) => driverName && normalize(employee.full_name) === driverName) ??
    null
  )
}

type RequireDriverApiOptions = {
  previewDriverId?: string | null
  requireTimeModule?: boolean
}

export async function requireDriverApi(options: RequireDriverApiOptions = {}) {
  const context = await requireApiCompany()
  if (!context) {
    return { ok: false as const, status: 401, error: 'Authentication required.' }
  }

  const { membership, supabase, user } = context

  if (!canUseDriverWorkflow(membership.role)) {
    return { ok: false as const, status: 403, error: 'Driver workflow access is not available for this user.' }
  }

  if (!membership.enabledModules.includes('transport')) {
    return { ok: false as const, status: 403, error: 'The transport module is not enabled for this company.' }
  }

  if (options.requireTimeModule && !membership.enabledModules.includes('time')) {
    return { ok: false as const, status: 403, error: 'The time module is not enabled for this company.' }
  }

  const { data: activeDrivers } = await supabase
    .from('drivers')
    .select('id, public_id, auth_user_id, full_name, email, phone, is_active')
    .eq('company_id', membership.company_id)
    .eq('is_active', true)
    .order('full_name')

  const matchedDriver = await getCurrentDriver(membership.company_id, user.id, user.email, supabase)
  const previewDriver = options.previewDriverId
    ? (activeDrivers ?? []).find((driver) => driver.public_id === options.previewDriverId || driver.id === options.previewDriverId) ?? null
    : null
  const activeDriver = membership.role === 'driver' ? matchedDriver : previewDriver ?? matchedDriver

  if (!activeDriver) {
    return { ok: false as const, status: 404, error: 'No linked driver profile found for this login.' }
  }

  const workforceEmployee = membership.enabledModules.includes('time')
    ? await resolveCurrentWorkforceEmployee(membership.company_id, user.id, activeDriver, supabase)
    : null

  return {
    ok: true as const,
    supabase,
    user,
    membership,
    activeDriver,
    activeDrivers: (activeDrivers ?? []) as Array<
      Pick<TableRow<'drivers'>, 'id' | 'public_id' | 'auth_user_id' | 'full_name' | 'email' | 'phone' | 'is_active'>
    >,
    matchedDriver,
    previewDriverId: previewDriver?.public_id ?? previewDriver?.id ?? null,
    isPreviewMode: membership.role !== 'driver' && Boolean(previewDriver),
    workforceEmployee,
  }
}
