import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TableRow } from '@/types/database'

export async function getBillingOverview(
  companyId: string,
  supabase: SupabaseClient<Database>,
): Promise<{
  billingAccount: TableRow<'company_billing_accounts'> | null
  subscription: TableRow<'company_subscriptions'> | null
}> {
  const [billingAccountResponse, subscriptionResponse] = await Promise.all([
    supabase.from('company_billing_accounts').select('*').eq('company_id', companyId).maybeSingle(),
    supabase.from('company_subscriptions').select('*').eq('company_id', companyId).maybeSingle(),
  ])

  if (billingAccountResponse.error) {
    throw new Error(billingAccountResponse.error.message)
  }

  if (subscriptionResponse.error) {
    throw new Error(subscriptionResponse.error.message)
  }

  return {
    billingAccount: (billingAccountResponse.data as TableRow<'company_billing_accounts'> | null) ?? null,
    subscription: (subscriptionResponse.data as TableRow<'company_subscriptions'> | null) ?? null,
  }
}
