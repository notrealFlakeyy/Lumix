import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { StatCard } from '@/components/dashboard/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { PayrollRunForm } from '@/components/payroll/payroll-run-form'
import { PayrollRunTable } from '@/components/payroll/payroll-run-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManagePayroll } from '@/lib/auth/permissions'
import { createPayrollRun } from '@/lib/db/mutations/workforce'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { getPayrollOverview } from '@/lib/db/queries/workforce'
import { formatCurrency } from '@/lib/utils/currency'
import { formatMinutesAsHours } from '@/lib/utils/workforce'
import { getOptionalString, getString } from '@/lib/utils/forms'
import { payrollRunSchema } from '@/lib/validations/payroll-run'

export default async function PayrollPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'payroll')
  const [overview, branches] = await Promise.all([
    getPayrollOverview(membership.company_id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
  ])

  async function createRunAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'payroll')
    if (!canManagePayroll(membership.role)) {
      throw new Error('Insufficient permissions to manage payroll runs.')
    }

    const input = payrollRunSchema.parse({
      branch_id: getOptionalString(formData, 'branch_id'),
      period_start: getString(formData, 'period_start'),
      period_end: getString(formData, 'period_end'),
      notes: getOptionalString(formData, 'notes'),
    })

    const run = await createPayrollRun(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/payroll`)
    revalidatePath(`/${locale}/time`)
    redirect(`/${locale}/payroll/runs/${run.id}`)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payroll"
        description="Payroll preparation built from approved branch-scoped time entries. Generate review runs, inspect estimated gross pay, and hand off a cleaner dataset to payroll processing."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Payroll runs" value={String(overview.runCount)} />
        <StatCard label="Draft runs" value={String(overview.draftRuns)} />
        <StatCard label="Approved hours pending" value={formatMinutesAsHours(overview.approvedTimeMinutes)} />
        <StatCard label="Estimated gross pending" value={formatCurrency(overview.estimatedGrossPending)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {canManagePayroll(membership.role) ? (
          <PayrollRunForm
            action={createRunAction}
            branches={branches.map((branch) => ({ value: branch.id, label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}` }))}
          />
        ) : (
          <Card >
            <CardHeader>
              <CardTitle>Payroll access</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your role can review payroll outputs but cannot generate new runs.
            </CardContent>
          </Card>
        )}

        <Card >
          <CardHeader>
            <CardTitle>Recent Payroll Runs</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.recentRuns.length > 0 ? (
              <PayrollRunTable runs={overview.recentRuns} />
            ) : (
              <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
                No payroll runs yet. Approve time entries in the Time module, then generate the first run here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Workflow Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div>1. Time entries are approved in <Link href="/time" className="text-foreground underline-offset-4 hover:underline">Time Tracking</Link>.</div>
          <div>2. Payroll runs group approved entries by employee and calculate estimated gross pay.</div>
          <div>3. Runs can then be reviewed, exported, and finalized from the payroll detail view.</div>
        </CardContent>
      </Card>
    </div>
  )
}
