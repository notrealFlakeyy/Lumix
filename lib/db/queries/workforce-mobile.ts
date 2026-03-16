import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { listTimeEntries } from '@/lib/db/queries/workforce'

export async function getMobileTimeSummary(
  companyId: string,
  employeeId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
) {
  const supabase = await getDbClient(client)
  const entries = await listTimeEntries(companyId, supabase, branchIds, {
    employeeId,
    limit: 14,
  })

  const today = new Date().toISOString().slice(0, 10)
  const openEntry = entries.find((entry) => entry.status === 'open' && !entry.end_time) ?? null
  const todaysEntries = entries.filter((entry) => entry.work_date === today)
  const todaysMinutes = todaysEntries.reduce((sum, entry) => sum + entry.regular_minutes + entry.overtime_minutes, 0)
  const submittedMinutes = entries
    .filter((entry) => entry.status === 'submitted')
    .reduce((sum, entry) => sum + entry.regular_minutes + entry.overtime_minutes, 0)

  const startOfWeek = new Date()
  const weekday = startOfWeek.getDay()
  const diff = weekday === 0 ? 6 : weekday - 1
  startOfWeek.setDate(startOfWeek.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)
  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const approvedWeekMinutes = entries
    .filter((entry) => entry.work_date >= weekStart && (entry.status === 'approved' || entry.status === 'exported'))
    .reduce((sum, entry) => sum + entry.regular_minutes + entry.overtime_minutes, 0)

  const { data: employee, error } = await supabase
    .from('workforce_employees')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', employeeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    employee: (employee as TableRow<'workforce_employees'> | null) ?? null,
    openEntry,
    todaysMinutes,
    submittedMinutes,
    approvedWeekMinutes,
    recentEntries: entries.slice(0, 8),
  }
}
