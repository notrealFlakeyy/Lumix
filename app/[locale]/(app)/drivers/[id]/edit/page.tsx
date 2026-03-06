import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { DriverForm } from '@/components/drivers/driver-form'
import { PageHeader } from '@/components/layout/page-header'
import { canEditMasterData } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateDriver } from '@/lib/db/mutations/drivers'
import { getDriverById } from '@/lib/db/queries/drivers'
import { driverSchema } from '@/lib/validations/driver'
import { getCheckboxValue, getOptionalString } from '@/lib/utils/forms'

export default async function EditDriverPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getDriverById(membership.company_id, id)
  if (!result) return null

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canEditMasterData(membership.role)) {
      throw new Error('Insufficient permissions to update drivers.')
    }

    const input = driverSchema.parse({
      full_name: getOptionalString(formData, 'full_name') ?? '',
      phone: getOptionalString(formData, 'phone'),
      email: getOptionalString(formData, 'email'),
      license_type: getOptionalString(formData, 'license_type'),
      employment_type: getOptionalString(formData, 'employment_type'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await updateDriver(membership.company_id, user.id, id, input)
    revalidatePath(`/${locale}/drivers`)
    revalidatePath(`/${locale}/drivers/${id}`)
    redirect(`/${locale}/drivers/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Driver" description="Update driver profile and assignment readiness details." />
      <DriverForm action={action} defaults={result.driver} submitLabel="Save driver" />
    </div>
  )
}
