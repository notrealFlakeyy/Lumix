import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TableRow } from '@/types/database'

export const defaultCompanyAppSettings = {
  order_prefix: 'ORD',
  order_next_number: 1,
  invoice_prefix: 'INV',
  invoice_next_number: 1,
  default_payment_terms_days: 14,
  default_vat_rate: '25.50',
  fuel_cost_per_km: '0.42',
  maintenance_cost_per_km: '0.18',
  driver_cost_per_hour: '32.00',
  waiting_cost_per_hour: '24.00',
  default_currency: 'EUR',
  invoice_footer: null,
  brand_accent: '#0f172a',
} as const

export async function getCompanyAppSettings(companyId: string, supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('company_app_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as TableRow<'company_app_settings'> | null) ?? null
}
