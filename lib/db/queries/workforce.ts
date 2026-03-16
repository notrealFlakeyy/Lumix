import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { calculateEstimatedGrossPay } from '@/lib/utils/workforce'
import { toNumber } from '@/lib/utils/numbers'

export async function listWorkforceEmployees(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let employeeQuery = supabase.from('workforce_employees').select('*').eq('company_id', companyId).order('full_name')
  if (branchScope) {
    employeeQuery = employeeQuery.in('branch_id', branchScope)
  }

  const [{ data: employees }, { data: branches }, { data: openEntries }] = await Promise.all([
    employeeQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('time_entries').select('employee_id').eq('company_id', companyId).is('end_time', null),
  ])

  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const openCountByEmployee = new Map<string, number>()
  for (const entry of (openEntries ?? []) as Array<Pick<TableRow<'time_entries'>, 'employee_id'>>) {
    openCountByEmployee.set(entry.employee_id, (openCountByEmployee.get(entry.employee_id) ?? 0) + 1)
  }

  return ((employees ?? []) as TableRow<'workforce_employees'>[]).map((employee) => ({
    ...employee,
    branch_name: branchMap.get(employee.branch_id)?.name ?? 'Unknown branch',
    has_open_entry: (openCountByEmployee.get(employee.id) ?? 0) > 0,
  }))
}

export async function listTimeEntries(
  companyId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
  options?: {
    employeeId?: string | null
    status?: string | null
    limit?: number
  },
) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let query = supabase.from('time_entries').select('*').eq('company_id', companyId).order('start_time', { ascending: false })
  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }
  if (options?.employeeId) {
    query = query.eq('employee_id', options.employeeId)
  }
  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const [{ data: entries }, { data: employees }, { data: branches }, { data: payrollRuns }] = await Promise.all([
    query,
    supabase.from('workforce_employees').select('id, full_name, branch_id').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('payroll_runs').select('id, period_start, period_end').eq('company_id', companyId),
  ])

  const employeeMap = byId((employees ?? []) as Array<Pick<TableRow<'workforce_employees'>, 'id' | 'full_name' | 'branch_id'>>)
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const payrollRunMap = byId((payrollRuns ?? []) as Array<Pick<TableRow<'payroll_runs'>, 'id' | 'period_start' | 'period_end'>>)

  return ((entries ?? []) as TableRow<'time_entries'>[]).map((entry) => ({
    ...entry,
    employee_name: employeeMap.get(entry.employee_id)?.full_name ?? 'Unknown employee',
    branch_name: branchMap.get(entry.branch_id)?.name ?? 'Unknown branch',
    payroll_period_label: entry.payroll_run_id
      ? `${payrollRunMap.get(entry.payroll_run_id)?.period_start ?? '?'} -> ${payrollRunMap.get(entry.payroll_run_id)?.period_end ?? '?'}`
      : null,
  }))
}

export async function getTimeOverview(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const today = new Date()
  const startOfWeek = new Date(today)
  const weekday = startOfWeek.getDay()
  const diff = weekday === 0 ? 6 : weekday - 1
  startOfWeek.setDate(startOfWeek.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)
  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const branchScope = normalizeBranchScope(branchIds)

  let employeesQuery = supabase.from('workforce_employees').select('*').eq('company_id', companyId)
  let timeEntriesQuery = supabase.from('time_entries').select('*').eq('company_id', companyId).gte('work_date', weekStart)
  let recentEntriesQuery = supabase.from('time_entries').select('*').eq('company_id', companyId).order('start_time', { ascending: false }).limit(8)
  if (branchScope) {
    employeesQuery = employeesQuery.in('branch_id', branchScope)
    timeEntriesQuery = timeEntriesQuery.in('branch_id', branchScope)
    recentEntriesQuery = recentEntriesQuery.in('branch_id', branchScope)
  }

  const [{ data: employees }, { data: entries }] = await Promise.all([employeesQuery, timeEntriesQuery])
  const recentEntries = await listTimeEntries(companyId, client, branchIds, { limit: 8 })

  const employeeRows = (employees ?? []) as TableRow<'workforce_employees'>[]
  const entryRows = (entries ?? []) as TableRow<'time_entries'>[]

  return {
    employeeCount: employeeRows.length,
    activeClockCount: entryRows.filter((entry) => entry.status === 'open').length,
    submittedCount: entryRows.filter((entry) => entry.status === 'submitted').length,
    approvedHoursThisWeek: entryRows
      .filter((entry) => entry.status === 'approved' || entry.status === 'exported')
      .reduce((sum, entry) => sum + entry.regular_minutes + entry.overtime_minutes, 0),
    unlinkedEmployees: employeeRows.filter((employee) => !employee.auth_user_id).length,
    recentEntries,
  }
}

export async function listPayrollRuns(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let runQuery = supabase.from('payroll_runs').select('*').eq('company_id', companyId).order('period_start', { ascending: false })
  if (branchScope) {
    runQuery = runQuery.or(`branch_id.is.null,branch_id.in.(${branchScope.join(',')})`)
  }

  const [{ data: runs }, { data: branches }, { data: items }] = await Promise.all([
    runQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('payroll_run_items').select('payroll_run_id, estimated_gross'),
  ])

  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const itemCountByRun = new Map<string, number>()
  const grossByRun = new Map<string, number>()
  for (const item of (items ?? []) as Array<Pick<TableRow<'payroll_run_items'>, 'payroll_run_id' | 'estimated_gross'>>) {
    itemCountByRun.set(item.payroll_run_id, (itemCountByRun.get(item.payroll_run_id) ?? 0) + 1)
    grossByRun.set(item.payroll_run_id, (grossByRun.get(item.payroll_run_id) ?? 0) + toNumber(item.estimated_gross))
  }

  return ((runs ?? []) as TableRow<'payroll_runs'>[]).map((run) => ({
    ...run,
    branch_name: run.branch_id ? branchMap.get(run.branch_id)?.name ?? 'Unknown branch' : 'All branches',
    employee_count: itemCountByRun.get(run.id) ?? 0,
    gross_total: grossByRun.get(run.id) ?? toNumber(run.total_estimated_gross),
  }))
}

export async function getPayrollRunById(companyId: string, runId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let runQuery = supabase.from('payroll_runs').select('*').eq('company_id', companyId).eq('id', runId)
  if (branchScope) {
    runQuery = runQuery.or(`branch_id.is.null,branch_id.in.(${branchScope.join(',')})`)
  }

  const { data: run, error } = await runQuery.maybeSingle()
  if (error) {
    throw error
  }
  const typedRun = run as TableRow<'payroll_runs'> | null
  if (!typedRun) {
    return null
  }

  const [{ data: items }, { data: employees }, { data: entries }, { data: branches }] = await Promise.all([
    supabase.from('payroll_run_items').select('*').eq('payroll_run_id', runId),
    supabase.from('workforce_employees').select('id, full_name, branch_id, pay_type').eq('company_id', companyId),
    supabase.from('time_entries').select('id, employee_id, work_date, regular_minutes, overtime_minutes, notes').eq('payroll_run_id', runId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const employeeMap = byId((employees ?? []) as Array<Pick<TableRow<'workforce_employees'>, 'id' | 'full_name' | 'branch_id' | 'pay_type'>>)
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const entryGroups = new Map<string, Array<Pick<TableRow<'time_entries'>, 'id' | 'employee_id' | 'work_date' | 'regular_minutes' | 'overtime_minutes' | 'notes'>>>()
  for (const entry of (entries ?? []) as Array<Pick<TableRow<'time_entries'>, 'id' | 'employee_id' | 'work_date' | 'regular_minutes' | 'overtime_minutes' | 'notes'>>) {
    const current = entryGroups.get(entry.employee_id) ?? []
    current.push(entry)
    entryGroups.set(entry.employee_id, current)
  }

  return {
    run: {
      ...typedRun,
      branch_name: typedRun.branch_id ? branchMap.get(typedRun.branch_id)?.name ?? 'Unknown branch' : 'All branches',
    },
    items: ((items ?? []) as TableRow<'payroll_run_items'>[]).map((item) => ({
      ...item,
      employee_name: employeeMap.get(item.employee_id)?.full_name ?? 'Unknown employee',
      branch_name: branchMap.get(employeeMap.get(item.employee_id)?.branch_id ?? '')?.name ?? 'Unknown branch',
      pay_type: employeeMap.get(item.employee_id)?.pay_type ?? 'hourly',
      time_entries: entryGroups.get(item.employee_id) ?? [],
    })),
  }
}

export async function getPayrollOverview(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const [runs, entries, employees] = await Promise.all([
    listPayrollRuns(companyId, client, branchIds),
    listTimeEntries(companyId, client, branchIds),
    listWorkforceEmployees(companyId, client, branchIds),
  ])

  const openMinutes = entries
    .filter((entry) => entry.status === 'approved')
    .reduce((sum, entry) => sum + entry.regular_minutes + entry.overtime_minutes, 0)

  const estimatedGrossPending = entries
    .filter((entry) => entry.status === 'approved')
    .reduce((sum, entry) => {
      const employee = employees.find((candidate) => candidate.id === entry.employee_id)
      if (!employee) return sum
      return (
        sum +
        calculateEstimatedGrossPay({
          regularMinutes: entry.regular_minutes,
          overtimeMinutes: entry.overtime_minutes,
          hourlyRate: employee.hourly_rate,
          overtimeRate: employee.overtime_rate,
        })
      )
    }, 0)

  return {
    runCount: runs.length,
    draftRuns: runs.filter((run) => run.status === 'draft').length,
    approvedTimeMinutes: openMinutes,
    estimatedGrossPending,
    recentRuns: runs.slice(0, 6),
  }
}
