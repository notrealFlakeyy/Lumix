import { revalidatePath } from 'next/cache'

import { StatCard } from '@/components/dashboard/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { WorkforceEmployeeForm } from '@/components/time/employee-form'
import { WorkforceEmployeeTable } from '@/components/time/employee-table'
import { ManualTimeEntryForm } from '@/components/time/manual-time-entry-form'
import { TimeEntryStatusBadge } from '@/components/time/time-entry-status-badge'
import { TimeEntryTable } from '@/components/time/time-entry-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManageTime } from '@/lib/auth/permissions'
import { getCurrentWorkforceEmployee } from '@/lib/auth/get-current-workforce-employee'
import { createWorkforceEmployee, createManualTimeEntry, finishSelfTimeEntry, startSelfTimeEntry, approveTimeEntry } from '@/lib/db/mutations/workforce'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { getTimeOverview, listTimeEntries, listWorkforceEmployees } from '@/lib/db/queries/workforce'
import { datetimeLocalToIso, getOptionalString, getString } from '@/lib/utils/forms'
import { formatDateTime } from '@/lib/utils/dates'
import { formatMinutesAsHours } from '@/lib/utils/workforce'
import { finishTimeEntrySchema, manualTimeEntrySchema } from '@/lib/validations/time-entry'
import { workforceEmployeeSchema } from '@/lib/validations/workforce-employee'

export default async function TimePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership, supabase } = await requireModuleAccess(locale, 'time')
  const [overview, employees, branches, currentEmployeeContext, recentOpenEntries, companyUsers] = await Promise.all([
    getTimeOverview(membership.company_id, undefined, membership.branchIds),
    listWorkforceEmployees(membership.company_id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
    getCurrentWorkforceEmployee(membership.company_id),
    listTimeEntries(membership.company_id, undefined, membership.branchIds, { status: 'open', limit: 6 }),
    supabase
      .from('company_users')
      .select('user_id, role')
      .eq('company_id', membership.company_id)
      .eq('is_active', true),
  ])
  const profileUserIds = ((companyUsers.data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)
  const { data: profiles } = profileUserIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', profileUserIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> }

  const currentEmployee = currentEmployeeContext.employee
  const currentOpenEntry = currentEmployee
    ? (await listTimeEntries(membership.company_id, undefined, membership.branchIds, { employeeId: currentEmployee.id, status: 'open', limit: 1 }))[0] ?? null
    : null

  const profileMap = new Map(((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((profile) => [profile.id, profile]))
  const memberRows = (companyUsers.data ?? []) as Array<{ user_id: string; role: string }>
  const userOptions = memberRows
    .filter((row) => !employees.some((employee) => employee.auth_user_id === row.user_id))
    .map((row) => ({
      value: row.user_id,
      label: `${profileMap.get(row.user_id)?.full_name ?? row.user_id} | ${row.role}`,
    }))

  async function createEmployeeAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'time')
    if (!canManageTime(membership.role)) {
      throw new Error('Insufficient permissions to manage employees.')
    }

    const input = workforceEmployeeSchema.parse({
      branch_id: getString(formData, 'branch_id'),
      auth_user_id: getOptionalString(formData, 'auth_user_id'),
      full_name: getString(formData, 'full_name'),
      email: getOptionalString(formData, 'email'),
      phone: getOptionalString(formData, 'phone'),
      job_title: getOptionalString(formData, 'job_title'),
      employment_type: getOptionalString(formData, 'employment_type'),
      pay_type: getString(formData, 'pay_type'),
      hourly_rate: getString(formData, 'hourly_rate'),
      overtime_rate: getOptionalString(formData, 'overtime_rate'),
      notes: getOptionalString(formData, 'notes'),
      is_active: true,
    })

    await createWorkforceEmployee(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/time`)
    revalidatePath(`/${locale}/payroll`)
  }

  async function createManualTimeAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'time')
    if (!canManageTime(membership.role)) {
      throw new Error('Insufficient permissions to manage time entries.')
    }

    const input = manualTimeEntrySchema.parse({
      employee_id: getString(formData, 'employee_id'),
      start_time: datetimeLocalToIso(getString(formData, 'start_time')),
      end_time: datetimeLocalToIso(getString(formData, 'end_time')),
      break_minutes: getString(formData, 'break_minutes'),
      notes: getOptionalString(formData, 'notes'),
    })

    await createManualTimeEntry(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/time`)
    revalidatePath(`/${locale}/payroll`)
  }

  async function clockInAction() {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'time')
    const employeeContext = await getCurrentWorkforceEmployee(membership.company_id)
    if (!employeeContext.employee) {
      throw new Error('No linked employee profile found for this user.')
    }

    await startSelfTimeEntry(membership.company_id, user.id, employeeContext.employee.id, membership.role === 'driver' ? 'driver' : 'clock')
    revalidatePath(`/${locale}/time`)
  }

  async function clockOutAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'time')
    const employeeContext = await getCurrentWorkforceEmployee(membership.company_id)
    if (!employeeContext.employee) {
      throw new Error('No linked employee profile found for this user.')
    }
    const openEntry = await listTimeEntries(membership.company_id, undefined, membership.branchIds, {
      employeeId: employeeContext.employee.id,
      status: 'open',
      limit: 1,
    })
    const entry = openEntry[0]
    if (!entry) {
      throw new Error('No open time entry found.')
    }

    const input = finishTimeEntrySchema.parse({
      break_minutes: getString(formData, 'break_minutes'),
      notes: getOptionalString(formData, 'notes'),
      end_time: undefined,
    })

    await finishSelfTimeEntry(membership.company_id, user.id, entry.id, input)
    revalidatePath(`/${locale}/time`)
    revalidatePath(`/${locale}/payroll`)
  }

  async function approveEntryAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'time')
    if (!canManageTime(membership.role)) {
      throw new Error('Insufficient permissions to approve time entries.')
    }

    await approveTimeEntry(membership.company_id, user.id, getString(formData, 'time_entry_id'))
    revalidatePath(`/${locale}/time`)
    revalidatePath(`/${locale}/payroll`)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Time Tracking"
        description="Branch-aware workforce time capture for drivers, warehouse teams, and operational staff. Self clocking, manual entries, and payroll-ready approval all live in one module."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="Employees" value={String(overview.employeeCount)} />
        <StatCard label="Clocked in" value={String(overview.activeClockCount)} />
        <StatCard label="Submitted" value={String(overview.submittedCount)} />
        <StatCard label="Approved hours this week" value={formatMinutesAsHours(overview.approvedHoursThisWeek)} />
        <StatCard label="Unlinked employees" value={String(overview.unlinkedEmployees)} hint="Employees missing a login link cannot self clock yet." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card >
            <CardHeader>
              <CardTitle>My Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentEmployee ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Linked employee: <span className="font-medium text-foreground">{currentEmployee.full_name}</span>
                  </div>
                  {currentOpenEntry ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                      <div className="font-medium">Clocked in since {formatDateTime(currentOpenEntry.start_time)}</div>
                      <div className="mt-1">Status: <TimeEntryStatusBadge status={currentOpenEntry.status as any} /></div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                      No active shift. Clock in when the workday starts.
                    </div>
                  )}

                  {!currentOpenEntry ? (
                    <form action={clockInAction}>
                      <Button type="submit">Clock in</Button>
                    </form>
                  ) : (
                    <form action={clockOutAction} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="break_minutes">Break minutes</Label>
                          <Input id="break_minutes" name="break_minutes" type="number" min="0" step="1" defaultValue="30" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="notes">Shift notes</Label>
                          <Input id="notes" name="notes" placeholder="Any exceptions, overtime reason, loading delay..." />
                        </div>
                      </div>
                      <Button type="submit">Clock out</Button>
                    </form>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                  No linked employee profile found for your user yet. An admin can create one below and link your login.
                </div>
              )}
            </CardContent>
          </Card>

          {canManageTime(membership.role) ? (
            branches.length > 0 ? (
              <WorkforceEmployeeForm
                action={createEmployeeAction}
                branches={branches.map((branch) => ({ value: branch.id, label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}` }))}
                users={userOptions}
              />
            ) : (
              <Card >
                <CardHeader>
                  <CardTitle>No branches configured</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">Create at least one branch before adding workforce employees.</CardContent>
              </Card>
            )
          ) : null}

          {canManageTime(membership.role) && employees.length > 0 ? (
            <ManualTimeEntryForm
              action={createManualTimeAction}
              employees={employees.map((employee) => ({
                value: employee.id,
                label: `${employee.full_name} | ${employee.branch_name}${employee.job_title ? ` | ${employee.job_title}` : ''}`,
              }))}
            />
          ) : null}
        </div>

        <div className="space-y-6">
          <Card >
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {employees.length > 0 ? (
                <WorkforceEmployeeTable employees={employees} />
              ) : (
                <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
                  No workforce employees yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card >
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {overview.recentEntries.length > 0 ? (
                <TimeEntryTable entries={overview.recentEntries} approveAction={approveEntryAction} canApprove={canManageTime(membership.role)} />
              ) : (
                <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
                  No time entries yet.
                </div>
              )}
            </CardContent>
          </Card>

          {recentOpenEntries.length > 0 ? (
            <Card >
              <CardHeader>
                <CardTitle>Open Shifts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentOpenEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border/20 px-4 py-4 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{entry.employee_name}</div>
                    <div>{entry.branch_name}</div>
                    <div>Started {formatDateTime(entry.start_time)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
