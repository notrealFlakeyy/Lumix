import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { DriverForm } from '@/components/drivers/driver-form'
import { PageHeader } from '@/components/layout/page-header'
import { canEditMasterData } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createDriver } from '@/lib/db/mutations/drivers'
import { driverSchema } from '@/lib/validations/driver'
import { getCheckboxValue, getOptionalString } from '@/lib/utils/forms'

export default async function NewDriverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requireCompany(locale)

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canEditMasterData(membership.role)) {
      throw new Error('Insufficient permissions to create drivers.')
    }

    const input = driverSchema.parse({
      full_name: getOptionalString(formData, 'full_name') ?? '',
      phone: getOptionalString(formData, 'phone'),
      email: getOptionalString(formData, 'email'),
      license_type: getOptionalString(formData, 'license_type'),
      employment_type: getOptionalString(formData, 'employment_type'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await createDriver(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/drivers`)
    redirect(`/${locale}/drivers`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Driver" description="Create a driver profile for assignment planning and trip reporting." />
      <DriverForm action={action} submitLabel="Create driver" />
    </div>
  )
}
