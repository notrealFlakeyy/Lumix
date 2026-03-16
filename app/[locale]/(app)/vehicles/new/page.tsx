import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { VehicleForm } from '@/components/vehicles/vehicle-form'
import { canEditMasterData } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createVehicle } from '@/lib/db/mutations/vehicles'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { vehicleSchema } from '@/lib/validations/vehicle'
import { getCheckboxValue, getOptionalString } from '@/lib/utils/forms'

export default async function NewVehiclePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const branches = await listActiveBranches(membership.company_id, membership)

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canEditMasterData(membership.role)) {
      throw new Error('Insufficient permissions to create vehicles.')
    }

    const input = vehicleSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
      registration_number: getOptionalString(formData, 'registration_number') ?? '',
      make: getOptionalString(formData, 'make'),
      model: getOptionalString(formData, 'model'),
      year: getOptionalString(formData, 'year'),
      fuel_type: getOptionalString(formData, 'fuel_type'),
      current_km: getOptionalString(formData, 'current_km'),
      next_service_km: getOptionalString(formData, 'next_service_km'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await createVehicle(membership.company_id, user.id, input, membership)
    revalidatePath(`/${locale}/vehicles`)
    redirect(`/${locale}/vehicles`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Vehicle" description="Add a fleet vehicle for dispatch assignments and trip tracking." />
      <VehicleForm action={action} branches={branches.map((branch) => ({ value: branch.id, label: branch.name }))} submitLabel="Create vehicle" />
    </div>
  )
}
