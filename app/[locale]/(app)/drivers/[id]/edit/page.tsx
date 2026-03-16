import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { DriverForm } from '@/components/drivers/driver-form'
import { PageHeader } from '@/components/layout/page-header'
import { canEditMasterData } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateDriver } from '@/lib/db/mutations/drivers'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { getDriverById } from '@/lib/db/queries/drivers'
import { driverSchema } from '@/lib/validations/driver'
import { getCheckboxValue, getOptionalString } from '@/lib/utils/forms'
import { getDriverRouteId } from '@/lib/utils/public-ids'

export default async function EditDriverPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const [result, branches] = await Promise.all([
    getDriverById(membership.company_id, id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
  ])
  if (!result) return null
  const driver = result.driver

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canEditMasterData(membership.role)) {
      throw new Error('Insufficient permissions to update drivers.')
    }

    const input = driverSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
      full_name: getOptionalString(formData, 'full_name') ?? '',
      phone: getOptionalString(formData, 'phone'),
      email: getOptionalString(formData, 'email'),
      license_type: getOptionalString(formData, 'license_type'),
      employment_type: getOptionalString(formData, 'employment_type'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await updateDriver(membership.company_id, user.id, driver.id, input, membership)
    revalidatePath(`/${locale}/drivers`)
    revalidatePath(`/${locale}/drivers/${getDriverRouteId(driver)}`)
    redirect(`/${locale}/drivers/${getDriverRouteId(driver)}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Driver" description="Update driver profile and assignment readiness details." />
      <DriverForm action={action} defaults={driver} branches={branches.map((branch) => ({ value: branch.id, label: branch.name }))} submitLabel="Save driver" />
    </div>
  )
}
