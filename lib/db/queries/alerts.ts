import 'server-only'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { toNumber } from '@/lib/utils/numbers'

export type Alert = {
  id: string
  type: 'overdue_invoice' | 'low_stock' | 'vehicle_maintenance' | 'expiring_license' | 'pending_approval'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  href: string
  entityId: string
  createdAt: string
}

export async function getDashboardAlerts(
  db: DbClient,
  companyId: string,
  locale: string,
  branchIds: string[] | null,
): Promise<Alert[]> {
  const supabase = await getDbClient(db)
  const branchScope = normalizeBranchScope(branchIds)
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // --- Overdue invoices ---
  let invoicesQuery = supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, due_date, status, created_at')
    .eq('company_id', companyId)
    .in('status', ['draft', 'sent', 'partially_paid'])
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(20)

  // --- Vehicles approaching service km ---
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('id, registration_number, make, model, current_km, next_service_km, created_at')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .not('next_service_km', 'is', null)

  // --- Time entries pending approval ---
  let timeEntriesQuery = supabase
    .from('time_entries')
    .select('id, employee_id, work_date, created_at', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('status', 'submitted')
    .limit(1)

  if (branchScope) {
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
    vehiclesQuery = vehiclesQuery.in('branch_id', branchScope)
    timeEntriesQuery = timeEntriesQuery.in('branch_id', branchScope)
  }

  const [{ data: invoices }, { data: vehicles }, { count: pendingTimeEntries }] = await Promise.all([
    invoicesQuery,
    vehiclesQuery,
    timeEntriesQuery,
  ])

  const alerts: Alert[] = []

  // Overdue invoice alerts
  for (const inv of invoices ?? []) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86_400_000)
    alerts.push({
      id: `overdue-inv-${inv.id}`,
      type: 'overdue_invoice',
      severity: 'critical',
      title: `Invoice ${inv.invoice_number} is overdue`,
      description: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past due date (${inv.due_date})`,
      href: `/${locale}/invoices`,
      entityId: inv.id,
      createdAt: inv.created_at,
    })
  }

  // Vehicle maintenance alerts (current_km within 5 000 km of next_service_km)
  const SERVICE_THRESHOLD_KM = 5000
  for (const v of vehicles ?? []) {
    const current = toNumber(v.current_km)
    const next = toNumber(v.next_service_km)
    if (next > 0 && current >= next - SERVICE_THRESHOLD_KM) {
      const remaining = Math.max(0, Math.round(next - current))
      const label = [v.registration_number, v.make, v.model].filter(Boolean).join(' ')
      alerts.push({
        id: `maint-${v.id}`,
        type: 'vehicle_maintenance',
        severity: remaining <= 0 ? 'critical' : 'warning',
        title: `${label} approaching service`,
        description: remaining <= 0 ? 'Service km exceeded' : `${remaining.toLocaleString()} km remaining until next service`,
        href: `/${locale}/vehicles`,
        entityId: v.id,
        createdAt: v.created_at,
      })
    }
  }

  // Pending time entry approvals (single aggregate alert)
  if (pendingTimeEntries && pendingTimeEntries > 0) {
    alerts.push({
      id: 'pending-time-entries',
      type: 'pending_approval',
      severity: 'info',
      title: `${pendingTimeEntries} time entr${pendingTimeEntries === 1 ? 'y' : 'ies'} awaiting approval`,
      description: 'Submitted time entries need review before payroll export.',
      href: `/${locale}/workforce/time`,
      entityId: '',
      createdAt: now.toISOString(),
    })
  }

  // Sort: critical first, then warning, then info
  const severityOrder: Record<Alert['severity'], number> = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}
