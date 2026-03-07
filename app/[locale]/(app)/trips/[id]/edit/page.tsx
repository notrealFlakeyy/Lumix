import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { TripForm } from '@/components/trips/trip-form'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateTrip } from '@/lib/db/mutations/trips'
import { listCustomers } from '@/lib/db/queries/customers'
import { listDrivers } from '@/lib/db/queries/drivers'
import { listOrders } from '@/lib/db/queries/orders'
import { getTripById } from '@/lib/db/queries/trips'
import { listVehicles } from '@/lib/db/queries/vehicles'
import { tripSchema } from '@/lib/validations/trip'
import { datetimeLocalToIso, getOptionalString, getString } from '@/lib/utils/forms'
import { getTripRouteId } from '@/lib/utils/public-ids'

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const [result, orders, customers, vehicles, drivers] = await Promise.all([
    getTripById(membership.company_id, id),
    listOrders(membership.company_id),
    listCustomers(membership.company_id),
    listVehicles(membership.company_id),
    listDrivers(membership.company_id),
  ])
  if (!result) return null
  const trip = result.trip

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

    const input = tripSchema.parse({
      transport_order_id: getOptionalString(formData, 'transport_order_id'),
      customer_id: getString(formData, 'customer_id'),
      vehicle_id: getOptionalString(formData, 'vehicle_id'),
      driver_id: getOptionalString(formData, 'driver_id'),
      start_time: datetimeLocalToIso(getOptionalString(formData, 'start_time')),
      end_time: datetimeLocalToIso(getOptionalString(formData, 'end_time')),
      start_km: getOptionalString(formData, 'start_km'),
      end_km: getOptionalString(formData, 'end_km'),
      distance_km: getOptionalString(formData, 'distance_km'),
      waiting_time_minutes: getOptionalString(formData, 'waiting_time_minutes') ?? 0,
      notes: getOptionalString(formData, 'notes'),
      delivery_confirmation: getOptionalString(formData, 'delivery_confirmation'),
      status: getString(formData, 'status'),
    })

    await updateTrip(membership.company_id, user.id, trip.id, input)
    revalidatePath(`/${locale}/trips`)
    revalidatePath(`/${locale}/trips/${getTripRouteId(trip)}`)
    redirect(`/${locale}/trips/${getTripRouteId(trip)}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Trip" description="Update trip execution details, odometer readings, and confirmation notes." />
      <TripForm
        action={action}
        defaults={trip}
        orders={orders.map((row) => ({ value: row.id, label: row.order_number }))}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        vehicles={vehicles.map((row) => ({ value: row.id, label: row.registration_number }))}
        drivers={drivers.map((row) => ({ value: row.id, label: row.full_name }))}
        submitLabel="Save trip"
      />
    </div>
  )
}
