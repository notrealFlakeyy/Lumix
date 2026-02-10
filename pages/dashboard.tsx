import Head from 'next/head'
import React, { useEffect, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting(new Date().getHours()))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [menuOpen])

  useEffect(() => {
    const handleRoute = () => setMenuOpen(false)
    router.events.on('routeChangeStart', handleRoute)
    return () => {
      router.events.off('routeChangeStart', handleRoute)
    }
  }, [router.events])

  const exportAllInvoices = async () => {
    setExportError(null)
    setExporting(true)
    try {
      const response = await fetch('/api/invoices/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Unable to export invoices.')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'invoices-export.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setExportOpen(false)
    } catch (requestError) {
      setExportError(requestError instanceof Error ? requestError.message : 'Unable to export invoices.')
    } finally {
      setExporting(false)
    }
  }

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
            <div className="dash-actions" ref={menuRef}>
              <button
                className="btn burger"
                type="button"
                aria-expanded={menuOpen}
                aria-controls="dashboard-menu"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className="burger-lines" />
                <span className="sr-only">Menu</span>
              </button>
              <div className={`dash-menu ${menuOpen ? 'open' : ''}`} id="dashboard-menu" role="menu">
                <button
                  className="btn primary"
                  role="menuitem"
                  disabled={!canManage}
                  onClick={() => {
                    if (canManage) {
                      router.push('/invoices/new')
                      setMenuOpen(false)
                    }
                  }}
                >
                  New invoice
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    setExportOpen(true)
                    setMenuOpen(false)
                  }}
                >
                  Export
                </button>
                <button className="btn" role="menuitem">Import</button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    router.push('/dashboard/clients')
                    setMenuOpen(false)
                  }}
                >
                  Clients
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    router.push('/dashboard/employees')
                    setMenuOpen(false)
                  }}
                >
                  Employees
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    router.push('/dashboard/payroll')
                    setMenuOpen(false)
                  }}
                >
                  Payroll
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    router.push('/dashboard/time')
                    setMenuOpen(false)
                  }}
                >
                  Time tracking
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    router.push('/dashboard/reports')
                    setMenuOpen(false)
                  }}
                >
                  Reports
                </button>
                <button
                  className="btn"
                  role="menuitem"
                  onClick={() => {
                    router.push('/dashboard/settings')
                    setMenuOpen(false)
                  }}
                >
                  Settings
                </button>
                <button
                  className="btn ghost"
                  role="menuitem"
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
          </div>
        </header>

        {exportOpen && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="panel-header">
                <h2>Export invoices</h2>
                <button className="btn ghost" type="button" onClick={() => setExportOpen(false)}>
                  Close
                </button>
              </div>
              <p className="section-subtitle">
                Export all invoices as a PDF summary. Selective export will be added later.
              </p>
              <div className="setup-actions">
                <button className="btn primary" type="button" onClick={exportAllInvoices} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Export all invoices'}
                </button>
                <button className="btn ghost" type="button" onClick={() => setExportOpen(false)}>
                  Cancel
                </button>
              </div>
              {exportError && <p className="form-error" role="alert">{exportError}</p>}
            </div>
          </div>
        )}

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
