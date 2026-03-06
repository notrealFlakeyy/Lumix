import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { OrderForm } from '@/components/orders/order-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createOrder } from '@/lib/db/mutations/orders'
import { listCustomers } from '@/lib/db/queries/customers'
import { listDrivers } from '@/lib/db/queries/drivers'
import { listVehicles } from '@/lib/db/queries/vehicles'
import { orderSchema } from '@/lib/validations/order'
import { datetimeLocalToIso, getOptionalString, getString } from '@/lib/utils/forms'

export default async function NewOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)

  const [customers, vehicles, drivers] = await Promise.all([
    listCustomers(membership.company_id),
    listVehicles(membership.company_id),
    listDrivers(membership.company_id),
  ])

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) {
      throw new Error('Insufficient permissions to create orders.')
    }

    const input = orderSchema.parse({
      customer_id: getString(formData, 'customer_id'),
      assigned_vehicle_id: getOptionalString(formData, 'assigned_vehicle_id'),
      assigned_driver_id: getOptionalString(formData, 'assigned_driver_id'),
      pickup_location: getString(formData, 'pickup_location'),
      delivery_location: getString(formData, 'delivery_location'),
      cargo_description: getOptionalString(formData, 'cargo_description'),
      scheduled_at: datetimeLocalToIso(getOptionalString(formData, 'scheduled_at')),
      status: getString(formData, 'status'),
      notes: getOptionalString(formData, 'notes'),
    })

    await createOrder(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/orders`)
    redirect(`/${locale}/orders`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Order" description="Create a transport order and optionally assign a vehicle and driver immediately." />
      <OrderForm
        action={action}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        vehicles={vehicles.map((row) => ({ value: row.id, label: row.registration_number }))}
        drivers={drivers.map((row) => ({ value: row.id, label: row.full_name }))}
        submitLabel="Create order"
      />
    </div>
  )
}
