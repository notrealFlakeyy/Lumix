import 'server-only'

import type { TableInsert, TableRow } from '@/types/database'
import type { FinishTimeEntryInput, ManualTimeEntryInput } from '@/lib/validations/time-entry'
import type { PayrollRunInput } from '@/lib/validations/payroll-run'
import type { WorkforceEmployeeInput } from '@/lib/validations/workforce-employee'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { calculateEstimatedGrossPay, calculateWorkedMinutes, splitRegularAndOvertime } from '@/lib/utils/workforce'
import { toNumber } from '@/lib/utils/numbers'

async function getEmployeeRecord(supabase: DbClient, companyId: string, employeeId: string) {
  const { data, error } = await supabase
    .from('workforce_employees')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', employeeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as TableRow<'workforce_employees'> | null
}

async function getTimeEntryRecord(supabase: DbClient, companyId: string, entryId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', entryId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as TableRow<'time_entries'> | null
}

async function getOpenTimeEntryForEmployee(supabase: DbClient, companyId: string, employeeId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .eq('status', 'open')
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as TableRow<'time_entries'> | null
}

export async function createWorkforceEmployee(companyId: string, userId: string, input: WorkforceEmployeeInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'employee')
  }

  const { data, error } = await supabase
    .from('workforce_employees')
    .insert({
      company_id: companyId,
      ...input,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const employee = data as TableRow<'workforce_employees'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'workforce_employee',
    entity_id: employee.id,
    action: 'create',
    new_values: employee,
  })

  return employee
}

export async function createManualTimeEntry(companyId: string, userId: string, input: ManualTimeEntryInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const employee = await getEmployeeRecord(supabase, companyId, input.employee_id)
  if (!employee) {
    throw new Error('Employee not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, employee.branch_id, 'time entry')
  }

  const workedMinutes = calculateWorkedMinutes(input.start_time, input.end_time, input.break_minutes)
  const split = splitRegularAndOvertime(workedMinutes)
  const payload: TableInsert<'time_entries'> = {
    company_id: companyId,
    branch_id: employee.branch_id,
    employee_id: employee.id,
    work_date: input.start_time.slice(0, 10),
    start_time: input.start_time,
    end_time: input.end_time,
    break_minutes: input.break_minutes,
    regular_minutes: split.regularMinutes,
    overtime_minutes: split.overtimeMinutes,
    status: 'approved',
    source: 'manual',
    notes: input.notes,
    created_by: userId,
    approved_by: userId,
  }

  const { data, error } = await supabase.from('time_entries').insert(payload).select('*').single()
  if (error) {
    throw error
  }

  const entry = data as TableRow<'time_entries'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'time_entry',
    entity_id: entry.id,
    action: 'create_manual',
    new_values: entry,
  })

  return entry
}

export async function startSelfTimeEntry(companyId: string, userId: string, employeeId: string, source: 'clock' | 'driver' = 'clock', client?: DbClient) {
  const supabase = await getDbClient(client)
  const employee = await getEmployeeRecord(supabase, companyId, employeeId)
  if (!employee) {
    throw new Error('Employee not found.')
  }
  if (employee.auth_user_id !== userId) {
    throw new Error('This employee profile is not linked to the current user.')
  }

  const existing = await getOpenTimeEntryForEmployee(supabase, companyId, employeeId)
  if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      company_id: companyId,
      branch_id: employee.branch_id,
      employee_id: employee.id,
      work_date: now.slice(0, 10),
      start_time: now,
      status: 'open',
      source,
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const entry = data as TableRow<'time_entries'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'time_entry',
    entity_id: entry.id,
    action: 'clock_in',
    new_values: entry,
  })

  return entry
}

export async function finishSelfTimeEntry(companyId: string, userId: string, entryId: string, input: FinishTimeEntryInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const entry = await getTimeEntryRecord(supabase, companyId, entryId)
  if (!entry) {
    throw new Error('Time entry not found.')
  }
  const employee = await getEmployeeRecord(supabase, companyId, entry.employee_id)
  if (!employee || employee.auth_user_id !== userId) {
    throw new Error('This time entry is not linked to the current user.')
  }
  if (entry.status !== 'open' || entry.end_time) {
    throw new Error('This time entry is already closed.')
  }

  const endTime = input.end_time ?? new Date().toISOString()
  const workedMinutes = calculateWorkedMinutes(entry.start_time, endTime, input.break_minutes)
  const split = splitRegularAndOvertime(workedMinutes)
  const notes = [entry.notes, input.notes].filter(Boolean).join('\n').trim() || null

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      end_time: endTime,
      break_minutes: input.break_minutes,
      regular_minutes: split.regularMinutes,
      overtime_minutes: split.overtimeMinutes,
      status: 'submitted',
      notes,
    })
    .eq('company_id', companyId)
    .eq('id', entryId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const updated = data as TableRow<'time_entries'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'time_entry',
    entity_id: updated.id,
    action: 'clock_out',
    old_values: entry,
    new_values: updated,
  })

  return updated
}

export async function approveTimeEntry(companyId: string, userId: string, entryId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const entry = await getTimeEntryRecord(supabase, companyId, entryId)
  if (!entry) {
    throw new Error('Time entry not found.')
  }
  if (!entry.end_time) {
    throw new Error('Open entries cannot be approved.')
  }
  if (entry.status === 'exported') {
    throw new Error('Exported entries cannot be approved again.')
  }

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: userId,
    })
    .eq('company_id', companyId)
    .eq('id', entryId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const updated = data as TableRow<'time_entries'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'time_entry',
    entity_id: updated.id,
    action: 'approve',
    old_values: entry,
    new_values: updated,
  })

  return updated
}

export async function createPayrollRun(companyId: string, userId: string, input: PayrollRunInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId && input.branch_id) {
    ensureBranchAccess(membership, input.branch_id, 'payroll run')
  }

  let employeesQuery = supabase.from('workforce_employees').select('*').eq('company_id', companyId).eq('is_active', true)
  let entriesQuery = supabase
    .from('time_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'approved')
    .is('payroll_run_id', null)
    .gte('work_date', input.period_start)
    .lte('work_date', input.period_end)

  if (input.branch_id) {
    employeesQuery = employeesQuery.eq('branch_id', input.branch_id)
    entriesQuery = entriesQuery.eq('branch_id', input.branch_id)
  }

  const [{ data: employees }, { data: entries }] = await Promise.all([employeesQuery, entriesQuery])
  const employeeMap = new Map(((employees ?? []) as TableRow<'workforce_employees'>[]).map((employee) => [employee.id, employee]))
  const grouped = new Map<string, TableRow<'time_entries'>[]>()
  for (const entry of (entries ?? []) as TableRow<'time_entries'>[]) {
    if (!employeeMap.has(entry.employee_id)) {
      continue
    }
    const current = grouped.get(entry.employee_id) ?? []
    current.push(entry)
    grouped.set(entry.employee_id, current)
  }

  if (grouped.size === 0) {
    throw new Error('No approved time entries found for the selected period.')
  }

  const runPayload: TableInsert<'payroll_runs'> = {
    company_id: companyId,
    branch_id: input.branch_id ?? null,
    period_start: input.period_start,
    period_end: input.period_end,
    status: 'draft',
    notes: input.notes,
    created_by: userId,
  }

  const { data: runData, error: runError } = await supabase.from('payroll_runs').insert(runPayload).select('*').single()
  if (runError) {
    throw runError
  }
  const run = runData as TableRow<'payroll_runs'>

  let totalRegularMinutes = 0
  let totalOvertimeMinutes = 0
  let totalEstimatedGross = 0
  const runItems: TableInsert<'payroll_run_items'>[] = []
  const entryIds: string[] = []

  for (const [employeeId, employeeEntries] of grouped.entries()) {
    const employee = employeeMap.get(employeeId)
    if (!employee) continue
    const regularMinutes = employeeEntries.reduce((sum, entry) => sum + entry.regular_minutes, 0)
    const overtimeMinutes = employeeEntries.reduce((sum, entry) => sum + entry.overtime_minutes, 0)
    const estimatedGross = calculateEstimatedGrossPay({
      regularMinutes,
      overtimeMinutes,
      hourlyRate: employee.hourly_rate,
      overtimeRate: employee.overtime_rate,
    })

    totalRegularMinutes += regularMinutes
    totalOvertimeMinutes += overtimeMinutes
    totalEstimatedGross += estimatedGross
    entryIds.push(...employeeEntries.map((entry) => entry.id))

    runItems.push({
      payroll_run_id: run.id,
      employee_id: employee.id,
      regular_minutes: regularMinutes,
      overtime_minutes: overtimeMinutes,
      hourly_rate: employee.hourly_rate,
      overtime_rate: employee.overtime_rate ?? toNumber(employee.hourly_rate) * 1.5,
      estimated_gross: estimatedGross,
      notes: null,
    })
  }

  if (runItems.length === 0) {
    throw new Error('No payroll items could be generated for the selected period.')
  }

  const { error: itemError } = await supabase.from('payroll_run_items').insert(runItems)
  if (itemError) {
    throw itemError
  }

  const { error: entryUpdateError } = await supabase
    .from('time_entries')
    .update({
      payroll_run_id: run.id,
      status: 'exported',
    })
    .eq('company_id', companyId)
    .in('id', entryIds)
  if (entryUpdateError) {
    throw entryUpdateError
  }

  const { data: updatedRunData, error: updateRunError } = await supabase
    .from('payroll_runs')
    .update({
      total_regular_minutes: totalRegularMinutes,
      total_overtime_minutes: totalOvertimeMinutes,
      total_estimated_gross: totalEstimatedGross,
    })
    .eq('company_id', companyId)
    .eq('id', run.id)
    .select('*')
    .single()
  if (updateRunError) {
    throw updateRunError
  }

  const updatedRun = updatedRunData as TableRow<'payroll_runs'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'payroll_run',
    entity_id: updatedRun.id,
    action: 'create',
    new_values: {
      ...updatedRun,
      item_count: runItems.length,
      entry_count: entryIds.length,
    },
  })

  return updatedRun
}

export async function updatePayrollRunStatus(companyId: string, userId: string, runId: string, status: 'reviewed' | 'exported' | 'finalized', client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: previous, error: previousError } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', runId)
    .maybeSingle()
  if (previousError) {
    throw previousError
  }
  if (!previous) {
    throw new Error('Payroll run not found.')
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .update({ status })
    .eq('company_id', companyId)
    .eq('id', runId)
    .select('*')
    .single()
  if (error) {
    throw error
  }

  const run = data as TableRow<'payroll_runs'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'payroll_run',
    entity_id: run.id,
    action: `mark_${status}`,
    old_values: previous,
    new_values: run,
  })

  return run
}
