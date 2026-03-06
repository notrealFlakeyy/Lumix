import 'server-only'

import type { TableRow } from '@/types/database'
import type { PaymentInput } from '@/lib/validations/payment'

import { refreshInvoicePaymentStatus } from '@/lib/db/mutations/invoices'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'

export async function registerPayment(companyId: string, userId: string, input: PaymentInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data, error } = await supabase
    .from('payments')
    .insert({
      company_id: companyId,
      invoice_id: input.invoice_id,
      payment_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method ?? null,
      reference: input.reference ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  await refreshInvoicePaymentStatus(companyId, userId, input.invoice_id, supabase)

  const payment = data as TableRow<'payments'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'payment',
    entity_id: payment.id,
    action: 'create',
    new_values: payment,
  })

  return payment
}
