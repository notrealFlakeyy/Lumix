import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import type { TableRow } from '@/types/database'
import { DriverShiftActionCard } from '@/components/driver/driver-shift-action-card'
import { DriverStatCard } from '@/components/driver/driver-stat-card'
import { TimeEntryStatusBadge } from '@/components/time/time-entry-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentWorkforceEmployee } from '@/lib/auth/get-current-workforce-employee'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { formatDateTime } from '@/lib/utils/dates'
import { formatMinutesAsHours } from '@/lib/utils/workforce'

export default async function DriverTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ driver?: string; success?: string; error?: string }>
}) {
  const { locale } = await params
  const { driver: previewDriverId, success, error } = await searchParams
  const context = await getDriverPortalContext(locale, previewDriverId)
  const { membership, activeDriver, isPreviewMode, previewDriverId: selectedDriverId } = context

  if (!membership.enabledModules.includes('time')) {
    redirect(selectedDriverId ? `/${locale}/driver?driver=${selectedDriverId}` : `/${locale}/driver`)
  }

  if (!activeDriver) {
    redirect(`/${locale}/driver`)
  }

  const currentEmployeeContext = membership.role === 'driver' ? await getCurrentWorkforceEmployee(membership.company_id) : null
  let employee =
    membership.role === 'driver'
      ? currentEmployeeContext?.employee ?? null
      : null

  if (!employee) {
    const { data: employees } = await context.supabase
      .from('workforce_employees')
      .select('*')
      .eq('company_id', membership.company_id)
      .eq('is_active', true)
    const employeeRows = ((employees ?? []) as TableRow<'workforce_employees'>[])

    employee =
      employeeRows.find((row) => row.auth_user_id && row.auth_user_id === activeDriver.auth_user_id) ??
      employeeRows.find((row) => row.email && activeDriver.email && row.email.trim().toLowerCase() === activeDriver.email.trim().toLowerCase()) ??
      employeeRows.find((row) => row.full_name.trim().toLowerCase() === activeDriver.full_name.trim().toLowerCase()) ??
      null
  }

  const timeSummary = employee
    ? await getMobileTimeSummary(membership.company_id, employee.id, context.supabase, membership.branchIds)
    : null

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Shift clocking</CardTitle>
              <CardDescription>Track field time, submit the shift for approval, and keep payroll preparation aligned with live operations.</CardDescription>
            </div>
            {timeSummary?.openEntry ? <Badge variant="success">Live shift</Badge> : <Badge variant="default">No active shift</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">{success}</div> : null}
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">{error}</div> : null}
          <div><span className="font-medium text-slate-900">Driver:</span> {activeDriver.full_name}</div>
          <div><span className="font-medium text-slate-900">Employee link:</span> {employee?.full_name ?? 'Not linked'}</div>
          <div><span className="font-medium text-slate-900">Mode:</span> {isPreviewMode ? 'Preview only' : 'Live self-service'}</div>
        </CardContent>
      </Card>

      {timeSummary ? (
        <div className="grid grid-cols-3 gap-3">
          <DriverStatCard label="Today" value={formatMinutesAsHours(timeSummary.todaysMinutes)} />
          <DriverStatCard label="Pending" value={formatMinutesAsHours(timeSummary.submittedMinutes)} />
          <DriverStatCard label="Week" value={formatMinutesAsHours(timeSummary.approvedWeekMinutes)} />
        </div>
      ) : null}

      {employee ? (
        <>
          <DriverShiftActionCard
            openEntry={
              timeSummary?.openEntry
                ? {
                    id: timeSummary.openEntry.id,
                    start_time: timeSummary.openEntry.start_time,
                    status: timeSummary.openEntry.status,
                  }
                : null
            }
            readOnly={isPreviewMode}
          />

          <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
            <CardHeader className="pb-4">
              <CardTitle>Recent shifts</CardTitle>
              <CardDescription>Latest time entries recorded for this employee profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeSummary && timeSummary.recentEntries.length > 0 ? (
                timeSummary.recentEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-950">{entry.work_date}</div>
                      <TimeEntryStatusBadge status={entry.status as any} />
                    </div>
                    <div className="mt-2">Start: {formatDateTime(entry.start_time)}</div>
                    <div>End: {formatDateTime(entry.end_time)}</div>
                    <div>Hours: {formatMinutesAsHours(entry.regular_minutes + entry.overtime_minutes)}</div>
                    {entry.notes ? <div className="mt-2 text-slate-500">{entry.notes}</div> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                  No shift history yet.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
          <CardHeader className="pb-4">
            <CardTitle>No linked employee profile</CardTitle>
            <CardDescription>The Time module is enabled, but this driver does not have a workforce employee row yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4">
              Link the driver login to a workforce employee in Settings before using live mobile shift clocking.
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href={selectedDriverId ? `/driver?driver=${selectedDriverId}` : '/driver'}>Back to mobile home</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
