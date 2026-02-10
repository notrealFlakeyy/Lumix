import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../lib/supabaseServer'
import { useRouter } from 'next/router'

type DashboardProps = {
  data: {
    kpis: Array<{ label: string; value: string; note: string }>
    invoices: Array<{ id: string; client: string; due: string; amount: string; status: 'pending' | 'overdue' | 'paid' }>
    employees: Array<{ name: string; team: string; role: string }>
  }
  employeeName: string
  role: 'admin' | 'manager' | 'viewer'
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async ({ req, res }) => {
  const supabase = getSupabaseServer({
    req, res,
    query: {},
    resolvedUrl: ''
  })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return {
      redirect: {
        destination: '/signup',
        permanent: false,
      },
    }
  }

  const [{ data: company }, { data: invoices }, { data: employees }] = await Promise.all([
    supabase.from('companies').select('cash_balance, next_payroll_total, next_payroll_date').eq('id', profile.company_id).single(),
    supabase.from('invoices').select('id, client, invoice_number, due_date, amount, status').eq('company_id', profile.company_id).limit(5),
    supabase.from('employees').select('id, full_name, team, role').eq('company_id', profile.company_id).limit(5),
  ])

  const cashBalance = company?.cash_balance ?? 0
  const payrollTotal = company?.next_payroll_total ?? 0
  const payrollDate = company?.next_payroll_date
    ? new Date(company.next_payroll_date).toLocaleDateString()
    : 'TBD'

  const outstanding = (invoices ?? []).filter((invoice: { status: string }) => invoice.status !== 'paid')
  const outstandingTotal = outstanding.reduce((sum: number, invoice: { amount: any }) => sum + Number(invoice.amount ?? 0), 0)

  return {
    props: {
      employeeName: profile?.full_name ?? '',
      role: (profile?.role ?? 'viewer') as 'admin' | 'manager' | 'viewer',
      data: {
        kpis: [
          { label: 'Cash balance', value: `$${cashBalance.toLocaleString()}`, note: 'Updated daily' },
          { label: 'Outstanding invoices', value: `$${outstandingTotal.toLocaleString()}`, note: `${outstanding.length} invoices open` },
          { label: 'Payroll scheduled', value: `$${payrollTotal.toLocaleString()}`, note: `Next run on ${payrollDate}` },
          { label: 'Active employees', value: `${employees?.length ?? 0}`, note: 'Active seats' },
        ],
        invoices: (invoices ?? []).map((invoice: { id: any; client: any; due_date: string | number | Date; status: string; amount: any }) => ({
          id: invoice.id,
          client: invoice.client,
          due: invoice.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : invoice.status === 'paid' ? 'Paid' : 'Due soon',
          amount: `$${Number(invoice.amount).toLocaleString()}`,
          status: invoice.status as 'pending' | 'overdue' | 'paid',
        })),
        employees: (employees ?? []).map((employee: { full_name: any; team: any; role: any }) => ({
          name: employee.full_name,
          team: employee.team ?? 'Team',
          role: employee.role ?? 'Member',
        })),
      },
    },
  }
}

const getTimeOfDayGreeting = (hours: number): string => {
  if (hours < 5) return 'Good night'
  if (hours < 12) return 'Good morning'
  if (hours < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ data, role, employeeName }: DashboardProps): JSX.Element {
  const canManage = role === 'admin' || role === 'manager'
  const [greeting, setGreeting] = useState('Welcome')
  const router = useRouter()

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting(new Date().getHours()))
  }, [])

  const name = employeeName?.trim() || 'there'
  return (
    <>
      <Head>
        <title>Lumix Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>{greeting}, {name}</h1>
              <p>Here is the latest on your cash flow, invoices, and payroll.</p>
            </div>
            <div className="dash-actions">
              <button className="btn">Export report</button>
              <button className="btn primary" disabled={!canManage}>Create invoice</button>
              <button
                className="btn ghost"
                onClick={async () => {
                  const { getSupabaseBrowser } = await import('../lib/supabaseClient')
                  await getSupabaseBrowser().auth.signOut()
                  window.location.href = '/login'
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="container dash-kpis">
          {data.kpis.map((kpi) => (
            <div className="kpi-card" key={kpi.label}>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <p>{kpi.note}</p>
            </div>
          ))}
        </section>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Invoice activity</h2>
              <button className="btn ghost">View all</button>
            </div>
            <div className="invoice-list">
              {data.invoices.map((invoice) => (
                <div className="invoice-row" key={invoice.id}>
                  <div>
                    <strong>{invoice.client}</strong>
                    <span>
                      {invoice.id} · {invoice.due}
                    </span>
                  </div>
                  <div className="invoice-meta">
                    <span>{invoice.amount}</span>
                    <span className={`status ${invoice.status}`}>{invoice.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Employee management</h2>
              <button className="btn ghost" disabled={!canManage}>Invite</button>
            </div>
            <div className="employee-list">
              {data.employees.map((employee) => (
                <div className="employee-row" key={employee.name}>
                  <div>
                    <strong>{employee.name}</strong>
                    <span>
                      {employee.team} · {employee.role}
                    </span>
                  </div>
                  <button className="btn" disabled={!canManage}>Manage</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
