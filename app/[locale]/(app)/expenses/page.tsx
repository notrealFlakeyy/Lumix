import { AlertCircle, CheckCircle2, Clock, Download, Filter, Plus, Receipt, TrendingUp, XCircle } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireModuleAccess } from '@/lib/auth/require-module-access'

type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed'
type ExpenseCategory = 'fuel' | 'accommodation' | 'meals' | 'tolls' | 'equipment' | 'repairs' | 'other'

type Expense = {
  id: string
  date: string
  description: string
  category: ExpenseCategory
  amount: number
  currency: string
  submittedBy: string
  status: ExpenseStatus
  receiptAttached: boolean
  notes?: string
}

// Mock data — replace with real Supabase queries once expenses table is created
const mockExpenses: Expense[] = [
  { id: 'exp-001', date: '2026-03-18', description: 'Diesel fill-up — Helsinki depot', category: 'fuel', amount: 284.5, currency: 'EUR', submittedBy: 'Matti Virtanen', status: 'approved', receiptAttached: true },
  { id: 'exp-002', date: '2026-03-17', description: 'Hotel — overnight Tampere run', category: 'accommodation', amount: 129.0, currency: 'EUR', submittedBy: 'Sari Leinonen', status: 'pending', receiptAttached: true },
  { id: 'exp-003', date: '2026-03-16', description: 'Motorway tolls E18 corridor', category: 'tolls', amount: 47.2, currency: 'EUR', submittedBy: 'Juhani Koskinen', status: 'reimbursed', receiptAttached: true },
  { id: 'exp-004', date: '2026-03-15', description: 'Crew lunch on long haul', category: 'meals', amount: 63.8, currency: 'EUR', submittedBy: 'Matti Virtanen', status: 'pending', receiptAttached: false },
  { id: 'exp-005', date: '2026-03-14', description: 'Replacement windscreen wiper', category: 'equipment', amount: 38.4, currency: 'EUR', submittedBy: 'Anna Heikkinen', status: 'approved', receiptAttached: true },
  { id: 'exp-006', date: '2026-03-13', description: 'Tyre puncture repair — Turku', category: 'repairs', amount: 95.0, currency: 'EUR', submittedBy: 'Sari Leinonen', status: 'rejected', receiptAttached: true, notes: 'Already covered by fleet maintenance budget' },
  { id: 'exp-007', date: '2026-03-12', description: 'AdBlue — border crossing stop', category: 'fuel', amount: 56.0, currency: 'EUR', submittedBy: 'Juhani Koskinen', status: 'reimbursed', receiptAttached: true },
  { id: 'exp-008', date: '2026-03-11', description: 'Ferry crossing — Stockholm freight', category: 'other', amount: 320.0, currency: 'EUR', submittedBy: 'Anna Heikkinen', status: 'approved', receiptAttached: true },
]

const categoryLabels: Record<ExpenseCategory, string> = {
  fuel: 'Fuel',
  accommodation: 'Accommodation',
  meals: 'Meals',
  tolls: 'Tolls',
  equipment: 'Equipment',
  repairs: 'Repairs',
  other: 'Other',
}

function statusBadge(status: ExpenseStatus) {
  const map: Record<ExpenseStatus, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
    pending: {
      label: 'Pending',
      icon: <Clock className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-accent-2), 0.25)', color: 'rgb(var(--app-contrast))', border: '1px solid rgba(var(--app-accent-2), 0.4)' },
    },
    approved: {
      label: 'Approved',
      icon: <CheckCircle2 className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-accent), 0.13)', color: 'rgb(var(--app-contrast))', border: '1px solid rgba(var(--app-accent), 0.25)' },
    },
    rejected: {
      label: 'Rejected',
      icon: <XCircle className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-contrast), 0.08)', color: 'rgb(var(--app-muted))', border: '1px solid rgba(var(--app-muted), 0.2)' },
    },
    reimbursed: {
      label: 'Reimbursed',
      icon: <CheckCircle2 className="h-3 w-3" />,
      style: { background: 'rgba(var(--app-accent-2), 0.15)', color: 'rgb(var(--app-contrast))', border: '1px solid rgba(var(--app-accent-2), 0.3)' },
    },
  }
  const { label, icon, style } = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={style}>
      {icon}
      {label}
    </span>
  )
}

export default async function ExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requireModuleAccess(locale, 'expenses')

  const expenses = mockExpenses
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const pending = expenses.filter((e) => e.status === 'pending')
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0)
  const approvedThisMonth = expenses.filter((e) => e.status === 'approved' || e.status === 'reimbursed')
  const approvedTotal = approvedThisMonth.reduce((s, e) => s + e.amount, 0)
  const noReceipt = expenses.filter((e) => !e.receiptAttached).length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses"
        description="Track, approve, and reimburse employee expense claims across all operations. Attach receipts and categorise spend to keep finance aligned."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New claim
            </Button>
          </>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total claimed',
            value: `€${total.toFixed(2)}`,
            icon: <Receipt className="h-5 w-5" />,
            hint: `${expenses.length} claims this period`,
          },
          {
            label: 'Awaiting approval',
            value: `€${pendingTotal.toFixed(2)}`,
            icon: <Clock className="h-5 w-5" />,
            hint: `${pending.length} claims pending review`,
            accent: true,
          },
          {
            label: 'Approved & reimbursed',
            value: `€${approvedTotal.toFixed(2)}`,
            icon: <CheckCircle2 className="h-5 w-5" />,
            hint: `${approvedThisMonth.length} claims processed`,
          },
          {
            label: 'Missing receipts',
            value: String(noReceipt),
            icon: <AlertCircle className="h-5 w-5" />,
            hint: 'Claims without receipt attachment',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            style={
              stat.accent
                ? { background: 'rgba(var(--app-accent), 0.1)', boxShadow: '0 0 0 1px rgba(var(--app-accent), 0.18)' }
                : {}
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgb(var(--app-muted))' }}>
                  {stat.label}
                </CardTitle>
                <span style={{ color: stat.accent ? 'rgb(var(--app-accent))' : 'rgba(var(--app-muted), 0.6)' }}>{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight" style={{ color: stat.accent ? 'rgb(var(--app-accent))' : 'rgb(var(--app-contrast))' }}>
                {stat.value}
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'rgba(var(--app-muted), 0.8)' }}>
                {stat.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        {/* Expense table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="tabular-nums text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
                      {expense.date}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate font-medium text-sm" style={{ color: 'rgb(var(--app-contrast))' }}>
                        {expense.description}
                      </div>
                      {expense.notes && (
                        <div className="truncate text-xs mt-0.5" style={{ color: 'rgb(var(--app-muted))' }}>
                          {expense.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="rounded-lg px-2 py-1 text-xs font-medium"
                        style={{ background: 'rgba(var(--app-muted), 0.1)', color: 'rgb(var(--app-muted))' }}
                      >
                        {categoryLabels[expense.category]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'rgb(var(--app-fg))' }}>
                      {expense.submittedBy}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-sm" style={{ color: 'rgb(var(--app-contrast))' }}>
                      €{expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {expense.receiptAttached ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: 'rgb(var(--app-accent))' }} />
                      ) : (
                        <AlertCircle className="h-4 w-4" style={{ color: 'rgba(var(--app-muted), 0.5)' }} />
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(expense.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Spend by category */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
            <p className="text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
              This period
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categoryLabels).map(([cat, label]) => {
              const catTotal = expenses
                .filter((e) => e.category === cat && e.status !== 'rejected')
                .reduce((s, e) => s + e.amount, 0)
              if (catTotal === 0) return null
              const pct = Math.round((catTotal / total) * 100)
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: 'rgb(var(--app-contrast))' }}>
                      {label}
                    </span>
                    <span className="tabular-nums" style={{ color: 'rgb(var(--app-muted))' }}>
                      €{catTotal.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--app-muted), 0.12)' }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, rgb(var(--app-accent)), rgba(var(--app-accent-2), 0.8))',
                      }}
                    />
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(var(--app-muted), 0.7)' }}>
                    {pct}% of total
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
