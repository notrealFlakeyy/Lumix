import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { InvoiceForm } from '@/components/invoices/invoice-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageInvoices } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createInvoice } from '@/lib/db/mutations/invoices'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listCustomers } from '@/lib/db/queries/customers'
import { listTrips } from '@/lib/db/queries/trips'
import { getTripDisplayId } from '@/lib/utils/public-ids'
import { invoiceSchema } from '@/lib/validations/invoice'
import { getOptionalString, getString, parseInvoiceItems } from '@/lib/utils/forms'

export default async function NewInvoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const [branches, { data: customers }, { data: trips }] = await Promise.all([
    listActiveBranches(membership.company_id, membership),
    listCustomers(membership.company_id, undefined, membership.branchIds, 1, 1000),
    listTrips(membership.company_id, undefined, membership.branchIds, 1, 1000),
  ])

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')

    const input = invoiceSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
      customer_id: getString(formData, 'customer_id'),
      trip_id: getOptionalString(formData, 'trip_id'),
      issue_date: getString(formData, 'issue_date'),
      due_date: getString(formData, 'due_date'),
      reference_number: getOptionalString(formData, 'reference_number'),
      status: getString(formData, 'status'),
      notes: getOptionalString(formData, 'notes'),
      items: parseInvoiceItems(formData),
    })

    const invoice = await createInvoice(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/invoices`)
    redirect(`/${locale}/invoices/${invoice.id}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create a transport invoice manually or link it to a completed trip." />
      <InvoiceForm
        action={action}
        defaults={{ issue_date: today, due_date: dueDate, status: 'draft' }}
        branches={branches.map((row) => ({ value: row.id, label: row.name }))}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        trips={trips.map((row) => ({ value: row.id, label: `${getTripDisplayId(row)} | ${row.customer_name}${'branch_name' in row ? ` | ${row.branch_name}` : ''}` }))}
        items={[{ description: 'Transport service', quantity: 1, unit_price: 0, vat_rate: 25.5 }]}
        submitLabel="Create invoice"
      />
    </div>
  )
}
