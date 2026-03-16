import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { OrderForm } from '@/components/orders/order-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateOrder } from '@/lib/db/mutations/orders'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listCustomers } from '@/lib/db/queries/customers'
import { listDrivers } from '@/lib/db/queries/drivers'
import { getOrderById } from '@/lib/db/queries/orders'
import { listVehicles } from '@/lib/db/queries/vehicles'
import { orderSchema } from '@/lib/validations/order'
import { datetimeLocalToIso, getOptionalString, getString } from '@/lib/utils/forms'

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const [result, branches, { data: customers }, { data: vehicles }, { data: drivers }] = await Promise.all([
    getOrderById(membership.company_id, id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
    listCustomers(membership.company_id, undefined, membership.branchIds, 1, 1000),
    listVehicles(membership.company_id, undefined, membership.branchIds, 1, 1000),
    listDrivers(membership.company_id, undefined, membership.branchIds, 1, 1000),
  ])
  if (!result) return null

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

    const input = orderSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
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

    await updateOrder(membership.company_id, user.id, id, input)
    revalidatePath(`/${locale}/orders`)
    revalidatePath(`/${locale}/orders/${id}`)
    redirect(`/${locale}/orders/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Order" description="Update dispatch information, assignments, and delivery details." />
      <OrderForm
        action={action}
        defaults={result.order}
        branches={branches.map((row) => ({ value: row.id, label: row.name }))}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        vehicles={vehicles.map((row) => ({ value: row.id, label: row.registration_number }))}
        drivers={drivers.map((row) => ({ value: row.id, label: row.full_name }))}
        submitLabel="Save order"
      />
    </div>
  )
}
