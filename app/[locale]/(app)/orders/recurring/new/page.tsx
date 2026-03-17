import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { RecurringOrderForm } from '@/components/orders/recurring-order-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createRecurringOrderTemplate } from '@/lib/db/mutations/recurring-orders'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listCustomers } from '@/lib/db/queries/customers'
import { listDrivers } from '@/lib/db/queries/drivers'
import { listVehicles } from '@/lib/db/queries/vehicles'
import { recurringOrderSchema } from '@/lib/validations/recurring-order'
import { getCheckboxValue, getOptionalString, getString } from '@/lib/utils/forms'

export default async function NewRecurringOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)

  const [branches, { data: customers }, { data: vehicles }, { data: drivers }] = await Promise.all([
    listActiveBranches(membership.company_id, membership),
    listCustomers(membership.company_id, undefined, membership.branchIds, 1, 1000),
    listVehicles(membership.company_id, undefined, membership.branchIds, 1, 1000),
    listDrivers(membership.company_id, undefined, membership.branchIds, 1, 1000),
  ])

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) {
      throw new Error('Insufficient permissions to manage recurring orders.')
    }

    const input = recurringOrderSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
      customer_id: getString(formData, 'customer_id'),
      vehicle_id: getOptionalString(formData, 'vehicle_id'),
      driver_id: getOptionalString(formData, 'driver_id'),
      pickup_location: getString(formData, 'pickup_location'),
      delivery_location: getString(formData, 'delivery_location'),
      cargo_description: getOptionalString(formData, 'cargo_description'),
      notes: getOptionalString(formData, 'notes'),
      recurrence_rule: getString(formData, 'recurrence_rule'),
      recurrence_day_of_week: getOptionalString(formData, 'recurrence_day_of_week'),
      recurrence_day_of_month: getOptionalString(formData, 'recurrence_day_of_month'),
      next_occurrence_date: getString(formData, 'next_occurrence_date'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await createRecurringOrderTemplate(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/orders/recurring`)
    redirect(`/${locale}/orders/recurring`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Recurring Order"
        description="Create a recurring transport template that can generate future orders on a schedule."
      />
      <RecurringOrderForm
        action={action}
        branches={branches.map((row) => ({ value: row.id, label: row.name }))}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        vehicles={vehicles.map((row) => ({ value: row.id, label: row.registration_number }))}
        drivers={drivers.map((row) => ({ value: row.id, label: row.full_name }))}
        submitLabel="Create template"
      />
    </div>
  )
}
