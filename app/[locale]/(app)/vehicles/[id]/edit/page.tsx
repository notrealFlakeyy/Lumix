import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { VehicleForm } from '@/components/vehicles/vehicle-form'
import { canEditMasterData } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateVehicle } from '@/lib/db/mutations/vehicles'
import { getVehicleById } from '@/lib/db/queries/vehicles'
import { vehicleSchema } from '@/lib/validations/vehicle'
import { getCheckboxValue, getOptionalString } from '@/lib/utils/forms'

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getVehicleById(membership.company_id, id)
  if (!result) return null

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canEditMasterData(membership.role)) {
      throw new Error('Insufficient permissions to update vehicles.')
    }

    const input = vehicleSchema.parse({
      registration_number: getOptionalString(formData, 'registration_number') ?? '',
      make: getOptionalString(formData, 'make'),
      model: getOptionalString(formData, 'model'),
      year: getOptionalString(formData, 'year'),
      fuel_type: getOptionalString(formData, 'fuel_type'),
      current_km: getOptionalString(formData, 'current_km'),
      next_service_km: getOptionalString(formData, 'next_service_km'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await updateVehicle(membership.company_id, user.id, id, input)
    revalidatePath(`/${locale}/vehicles`)
    revalidatePath(`/${locale}/vehicles/${id}`)
    redirect(`/${locale}/vehicles/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Vehicle" description="Update vehicle information and service planning values." />
      <VehicleForm action={action} defaults={result.vehicle} submitLabel="Save vehicle" />
    </div>
  )
}
