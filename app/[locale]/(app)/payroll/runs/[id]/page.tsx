import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { PayrollRunStatusBadge } from '@/components/payroll/payroll-run-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManagePayroll } from '@/lib/auth/permissions'
import { getPayrollRunById } from '@/lib/db/queries/workforce'
import { updatePayrollRunStatus } from '@/lib/db/mutations/workforce'
import { formatCurrency } from '@/lib/utils/currency'
import { formatMinutesAsHours } from '@/lib/utils/workforce'
import { getString } from '@/lib/utils/forms'
import { payrollRunStatusSchema } from '@/lib/validations/payroll-run'

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireModuleAccess(locale, 'payroll')
  const bundle = await getPayrollRunById(membership.company_id, id, undefined, membership.branchIds)

  if (!bundle) {
    notFound()
  }

  async function statusAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'payroll')
    if (!canManagePayroll(membership.role)) {
      throw new Error('Insufficient permissions to manage payroll runs.')
    }

    const status = payrollRunStatusSchema.parse(getString(formData, 'status'))
    if (status === 'draft') {
      throw new Error('Payroll runs are created in draft status automatically.')
    }

    await updatePayrollRunStatus(membership.company_id, user.id, id, status)
    revalidatePath(`/${locale}/payroll`)
    revalidatePath(`/${locale}/payroll/runs/${id}`)
    redirect(`/${locale}/payroll/runs/${id}`)
  }

  const run = bundle.run

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Payroll run ${run.period_start} -> ${run.period_end}`}
        description={`Branch scope: ${run.branch_name}. Review estimated gross pay, employee totals, and linked time entries before handoff.`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/payroll">Back to payroll</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card >
          <CardHeader>
            <CardTitle>Run Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <div><span className="font-medium text-foreground">Status:</span> <PayrollRunStatusBadge status={run.status as any} /></div>
            <div><span className="font-medium text-foreground">Branch:</span> {run.branch_name}</div>
            <div><span className="font-medium text-foreground">Regular hours:</span> {formatMinutesAsHours(run.total_regular_minutes)}</div>
            <div><span className="font-medium text-foreground">Overtime hours:</span> {formatMinutesAsHours(run.total_overtime_minutes)}</div>
            <div><span className="font-medium text-foreground">Estimated gross:</span> {formatCurrency(Number(run.total_estimated_gross))}</div>
            <div><span className="font-medium text-foreground">Employees:</span> {bundle.items.length}</div>
            <div className="md:col-span-2"><span className="font-medium text-foreground">Notes:</span> {run.notes ?? '-'}</div>
          </CardContent>
        </Card>

        {canManagePayroll(membership.role) ? (
          <Card >
            <CardHeader>
              <CardTitle>Run Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {run.status === 'draft' ? (
                <form action={statusAction}>
                  <input type="hidden" name="status" value="reviewed" />
                  <Button type="submit" variant="outline">Mark reviewed</Button>
                </form>
              ) : null}
              {(run.status === 'draft' || run.status === 'reviewed') ? (
                <form action={statusAction}>
                  <input type="hidden" name="status" value="exported" />
                  <Button type="submit" variant="outline">Mark exported</Button>
                </form>
              ) : null}
              {run.status !== 'finalized' ? (
                <form action={statusAction}>
                  <input type="hidden" name="status" value="finalized" />
                  <Button type="submit">Finalize run</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Employee Totals</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Pay type</TableHead>
                <TableHead>Regular</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Gross</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.employee_name}</TableCell>
                  <TableCell>{item.branch_name}</TableCell>
                  <TableCell>{item.pay_type}</TableCell>
                  <TableCell>{formatMinutesAsHours(item.regular_minutes)}</TableCell>
                  <TableCell>{formatMinutesAsHours(item.overtime_minutes)}</TableCell>
                  <TableCell>{formatCurrency(Number(item.estimated_gross))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle>Linked Time Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bundle.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border/20 px-4 py-4">
              <div className="mb-3 font-medium text-foreground">{item.employee_name}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work date</TableHead>
                    <TableHead>Regular</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.time_entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.work_date}</TableCell>
                      <TableCell>{formatMinutesAsHours(entry.regular_minutes)}</TableCell>
                      <TableCell>{formatMinutesAsHours(entry.overtime_minutes)}</TableCell>
                      <TableCell>{entry.notes ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
