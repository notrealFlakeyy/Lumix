import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TableInsert, TableName, TableRow } from '@/types/database'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

export async function getNextDocumentNumber(
  client: DbClient,
  table: 'transport_orders' | 'invoices',
  companyId: string,
  prefix: string,
) {
  const column = table === 'transport_orders' ? 'order_number' : 'invoice_number'
  const { data } = await client
    .from(table)
    .select(column)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)

  const latest = data?.[0]?.[column as keyof (typeof data)[number]]
  const numeric = typeof latest === 'string' ? Number(latest.split('-').at(-1) ?? 0) : 0
  return `${prefix}-${String(numeric + 1).padStart(4, '0')}`
}

export type CompanyScopedRow<T extends TableName> = TableRow<T> & { company_id: string }
