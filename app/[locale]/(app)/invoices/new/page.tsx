import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { InvoiceForm } from '@/components/invoices/invoice-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageInvoices } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createInvoice } from '@/lib/db/mutations/invoices'
import { listCustomers } from '@/lib/db/queries/customers'
import { listTrips } from '@/lib/db/queries/trips'
import { invoiceSchema } from '@/lib/validations/invoice'
import { getOptionalString, getString, parseInvoiceItems } from '@/lib/utils/forms'

export default async function NewInvoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const [customers, trips] = await Promise.all([listCustomers(membership.company_id), listTrips(membership.company_id)])

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')

    const input = invoiceSchema.parse({
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
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        trips={trips.map((row) => ({ value: row.id, label: `${row.id.slice(0, 8).toUpperCase()} • ${row.customer_name}` }))}
        items={[{ description: 'Transport service', quantity: 1, unit_price: 0, vat_rate: 25.5 }]}
        submitLabel="Create invoice"
      />
    </div>
  )
}
