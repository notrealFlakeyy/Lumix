import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { QuoteForm } from '@/components/orders/quote-form'
import { PageHeader } from '@/components/layout/page-header'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateQuote } from '@/lib/db/mutations/quotes'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listCustomers } from '@/lib/db/queries/customers'
import { getQuoteById } from '@/lib/db/queries/quotes'
import { getOptionalString, getString, parseInvoiceItems } from '@/lib/utils/forms'
import { quoteSchema } from '@/lib/validations/quote'

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const [result, branches, { data: customers }] = await Promise.all([
    getQuoteById(membership.company_id, id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
    listCustomers(membership.company_id, undefined, membership.branchIds, 1, 1000),
  ])

  if (!result) notFound()

  async function action(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

    await updateQuote(
      membership.company_id,
      user.id,
      id,
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

    revalidatePath(`/${locale}/orders/quotes`)
    revalidatePath(`/${locale}/orders/quotes/${id}`)
    redirect(`/${locale}/orders/quotes/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Quote" description="Update route details, pricing lines, and quote validity before conversion." />
      <QuoteForm
        action={action}
        defaults={result.quote}
        branches={branches.map((row) => ({ value: row.id, label: row.name }))}
        customers={customers.map((row) => ({ value: row.id, label: row.name }))}
        items={result.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
        }))}
        submitLabel="Save quote"
      />
    </div>
  )
}
