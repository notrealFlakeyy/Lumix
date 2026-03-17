import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { QuoteForm } from '@/components/orders/quote-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createQuote } from '@/lib/db/mutations/quotes'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listCustomers } from '@/lib/db/queries/customers'
import { todayIsoDate } from '@/lib/utils/dates'
import { getOptionalString, getString, parseInvoiceItems } from '@/lib/utils/forms'
import { quoteSchema } from '@/lib/validations/quote'

export default async function NewQuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const [branches, { data: customers }] = await Promise.all([
    listActiveBranches(membership.company_id, membership),
    listCustomers(membership.company_id, undefined, membership.branchIds, 1, 1000),
  ])

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

    const quote = await createQuote(
      membership.company_id,
      user.id,
      quoteSchema.parse({
        branch_id: getOptionalString(formData, 'branch_id'),
        customer_id: getString(formData, 'customer_id'),
        title: getString(formData, 'title'),
        pickup_location: getString(formData, 'pickup_location'),
        delivery_location: getString(formData, 'delivery_location'),
        cargo_description: getOptionalString(formData, 'cargo_description'),
        issue_date: getString(formData, 'issue_date'),
        valid_until: getOptionalString(formData, 'valid_until'),
        status: getString(formData, 'status'),
        notes: getOptionalString(formData, 'notes'),
        items: parseInvoiceItems(formData),
      }),
    )

    revalidatePath(`/${locale}/orders`)
    revalidatePath(`/${locale}/orders/quotes`)
    redirect(`/${locale}/orders/quotes/${quote.id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Quote" description="Prepare a transport offer before the work becomes an operational order." />
      <QuoteForm
        action={action}
        defaults={{ issue_date: todayIsoDate(), status: 'draft' }}
        branches={branches.map((row) => ({ value: row.id, label: row.name }))}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        items={[{ description: 'Transport service', quantity: 1, unit_price: 0, vat_rate: 25.5 }]}
        submitLabel="Create quote"
      />
    </div>
  )
}
