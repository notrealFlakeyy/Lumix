import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TableInsert, TableName, TableRow } from '@/types/database'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { defaultCompanyAppSettings } from '@/lib/db/queries/company-settings'

export type DbClient = SupabaseClient<Database>

export async function getDbClient(client?: DbClient) {
  return client ?? createSupabaseServerClient()
}

export function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]))
}

export async function insertAuditLog(client: DbClient, input: TableInsert<'audit_logs'>) {
  await client.from('audit_logs').insert(input)
}

export async function ensureCompanyAppSettings(client: DbClient, companyId: string) {
  const { data, error } = await client
    .from('company_app_settings')
    .upsert(
      {
        company_id: companyId,
      },
      { onConflict: 'company_id' },
    )
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return (data as TableRow<'company_app_settings'> | null) ?? {
    company_id: companyId,
    ...defaultCompanyAppSettings,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function getNextDocumentNumber(
  client: DbClient,
  table: 'transport_orders' | 'invoices',
  companyId: string,
  prefix: string,
) {
  const column = table === 'transport_orders' ? 'order_number' : 'invoice_number'
  const settings = await ensureCompanyAppSettings(client, companyId)
  const config =
    table === 'transport_orders'
      ? {
          prefix: settings.order_prefix ?? prefix,
          nextNumber: settings.order_next_number ?? 1,
          field: 'order_next_number' as const,
        }
      : {
          prefix: settings.invoice_prefix ?? prefix,
          nextNumber: settings.invoice_next_number ?? 1,
          field: 'invoice_next_number' as const,
        }

  const { data: existingRows } = await client
    .from(table)
    .select(column)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)

  const latest = existingRows?.[0]?.[column as keyof (typeof existingRows)[number]]
  const latestNumeric = typeof latest === 'string' ? Number(latest.split('-').at(-1) ?? 0) : 0
  const nextNumber = Math.max(config.nextNumber, latestNumeric + 1)
  const documentNumber = `${config.prefix}-${String(nextNumber).padStart(4, '0')}`
  const { error } = await client
    .from('company_app_settings')
    .update({
      [config.field]: nextNumber + 1,
    })
    .eq('company_id', companyId)

  if (error) {
    throw error
  }

  return documentNumber
}

export type CompanyScopedRow<T extends TableName> = TableRow<T> & { company_id: string }
