import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type SummaryResponse = {
  employeeName: string
  role: 'admin' | 'manager' | 'viewer'
  data: {
    kpis: Array<{ label: string; value: string; note: string }>
    invoices: Array<{ id: string; client: string; due: string; amount: string; status: 'pending' | 'overdue' | 'paid' }>
    employees: Array<{ name: string; team: string; role: string }>
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const supabase = createPagesServerClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ message: 'You must be signed in.' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  const [{ data: company }, { data: invoices }, { data: employees }] = await Promise.all([
    supabase.from('companies').select(`
      cash_balance,
      next_payroll_total,
      next_payroll_date,
      kpi_cash_label,
      kpi_cash_note,
      kpi_outstanding_label,
      kpi_outstanding_note,
      kpi_payroll_label,
      kpi_payroll_note,
      kpi_employees_label,
      kpi_employees_note
    `).eq('id', profile.company_id).single(),
    supabase.from('invoices').select('id, client, invoice_number, due_date, amount, status').eq('company_id', profile.company_id).limit(5),
    supabase.from('employees').select('id, full_name, team, role').eq('company_id', profile.company_id).limit(5),
  ])

  const cashBalance = company?.cash_balance ?? 0
  const payrollTotal = company?.next_payroll_total ?? 0
  const payrollDate = company?.next_payroll_date
    ? new Date(company.next_payroll_date).toLocaleDateString()
    : 'TBD'

  const outstanding = (invoices ?? []).filter((invoice: { status: string }) => invoice.status !== 'paid')
  const outstandingTotal = outstanding.reduce((sum: number, invoice: { amount: number }) => sum + Number(invoice.amount ?? 0), 0)
  const applyTemplate = (template: string, values: Record<string, string>) => {
    let result = template
    Object.entries(values).forEach(([key, value]) => {
      result = result.replaceAll(`{${key}}`, value)
    })
    return result
  }

  const payload: SummaryResponse = {
    employeeName: profile?.full_name ?? '',
    role: (profile?.role ?? 'viewer') as 'admin' | 'manager' | 'viewer',
    data: {
      kpis: [
        {
          label: company?.kpi_cash_label || 'Cash balance',
          value: `$${cashBalance.toLocaleString()}`,
          note: company?.kpi_cash_note || 'Updated daily',
        },
        {
          label: company?.kpi_outstanding_label || 'Outstanding invoices',
          value: `$${outstandingTotal.toLocaleString()}`,
          note: company?.kpi_outstanding_note
            ? applyTemplate(company.kpi_outstanding_note, { count: String(outstanding.length) })
            : `${outstanding.length} invoices open`,
        },
        {
          label: company?.kpi_payroll_label || 'Payroll scheduled',
          value: `$${payrollTotal.toLocaleString()}`,
          note: company?.kpi_payroll_note
            ? applyTemplate(company.kpi_payroll_note, { payrollDate })
            : `Next run on ${payrollDate}`,
        },
        {
          label: company?.kpi_employees_label || 'Active employees',
          value: `${employees?.length ?? 0}`,
          note: company?.kpi_employees_note || 'Active seats',
        },
      ],
      invoices: (invoices ?? []).map((invoice: { id: string; client: string; due_date: string | Date; status: string; amount: number }) => ({
        id: invoice.id,
        client: invoice.client,
        due: invoice.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : invoice.status === 'paid' ? 'Paid' : 'Due soon',
        amount: `$${Number(invoice.amount).toLocaleString()}`,
        status: invoice.status as 'pending' | 'overdue' | 'paid',
      })),
      employees: (employees ?? []).map((employee: { full_name: string; team: string; role: string }) => ({
        name: employee.full_name,
        team: employee.team ?? 'Team',
        role: employee.role ?? 'Member',
      })),
    },
  }

  return res.status(200).json(payload)
}
