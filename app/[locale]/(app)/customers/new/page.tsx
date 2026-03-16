import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { CustomerForm } from '@/components/customers/customer-form'
import { PageHeader } from '@/components/layout/page-header'
import { canEditMasterData } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createCustomer } from '@/lib/db/mutations/customers'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { customerSchema } from '@/lib/validations/customer'
import { getOptionalString, getString } from '@/lib/utils/forms'

export default async function NewCustomerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { user, membership } = await requireCompany(locale)
  const branches = await listActiveBranches(membership.company_id, membership)

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canEditMasterData(membership.role)) {
      throw new Error('Insufficient permissions to create customers.')
    }

    const input = customerSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
      name: getString(formData, 'name'),
      email: getOptionalString(formData, 'email'),
      business_id: getOptionalString(formData, 'business_id'),
      vat_number: getOptionalString(formData, 'vat_number'),
      phone: getOptionalString(formData, 'phone'),
      billing_address_line1: getOptionalString(formData, 'billing_address_line1'),
      billing_address_line2: getOptionalString(formData, 'billing_address_line2'),
      billing_postal_code: getOptionalString(formData, 'billing_postal_code'),
      billing_city: getOptionalString(formData, 'billing_city'),
      billing_country: getOptionalString(formData, 'billing_country'),
      notes: getOptionalString(formData, 'notes'),
    })

    await createCustomer(membership.company_id, user.id, input, membership)
    revalidatePath(`/${locale}/customers`)
    redirect(`/${locale}/customers`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Customer" description="Create a customer account for transport orders, trips, and invoicing." />
      <CustomerForm action={action} branches={branches.map((branch) => ({ value: branch.id, label: branch.name }))} submitLabel="Create customer" />
    </div>
  )
}
