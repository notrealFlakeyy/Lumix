import { getDbClient, type DbClient } from '@/lib/db/shared'

export async function getInvoiceStatusSummary(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase.from('invoices').select('status, total').eq('company_id', companyId)
  const summary = new Map<string, { count: number; total: number }>()

  for (const invoice of data ?? []) {
    const current = summary.get(invoice.status) ?? { count: 0, total: 0 }
    summary.set(invoice.status, { count: current.count + 1, total: current.total + Number(invoice.total ?? 0) })
  }

  return Array.from(summary.entries()).map(([status, values]) => ({ status, ...values }))
}

export async function getTripVolumeOverTime(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase
    .from('trips')
    .select('created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  const volume = new Map<string, number>()
  for (const trip of data ?? []) {
    const key = trip.created_at.slice(0, 7)
    volume.set(key, (volume.get(key) ?? 0) + 1)
  }

  return Array.from(volume.entries()).map(([period, count]) => ({ period, count }))
}
