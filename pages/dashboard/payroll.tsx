import Head from 'next/head'
import React, { useEffect, useMemo, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type Employee = {
  id: string
  full_name: string
  team: string | null
  role: string | null
  status: string | null
  hourly_rate: number | null
}

type PayrollSettings = {
  payroll_frequency: string | null
  payroll_currency: string | null
  payroll_next_run_date: string | null
}

type PayrollRun = {
  id: string
  run_date: string
  frequency: string
  currency: string
  status: string
  total_gross: number
  total_tax: number
  total_deductions: number
  total_net: number
}

type PayrollItemInput = {
  employeeId: string
  gross: string
  tax: string
  deductions: string
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
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
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = (profile?.role ?? 'viewer') as 'admin' | 'manager' | 'viewer'
  if (role === 'viewer') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }

  return { props: {} }
}

const formatAmount = (amount: number, currency: string) => {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : ''
  return `${symbol}${amount.toFixed(2)}`
}

export default function PayrollPage(): JSX.Element {
  const [settings, setSettings] = useState<PayrollSettings>({
    payroll_frequency: 'monthly',
    payroll_currency: 'EUR',
    payroll_next_run_date: '',
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [items, setItems] = useState<PayrollItemInput[]>([])
  const [timeSummary, setTimeSummary] = useState<Record<string, number>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      const settingsRes = await fetch('/api/payroll/settings')
      const runsRes = await fetch('/api/payroll/runs')
      const employeesRes = await fetch('/api/employees/list')

      const settingsPayload = settingsRes.ok ? await settingsRes.json().catch(() => null) : null
      const runsPayload = runsRes.ok ? await runsRes.json().catch(() => null) : null
      const employeesPayload = employeesRes.ok ? await employeesRes.json().catch(() => null) : null

      const loadedSettings = settingsPayload?.settings ?? {}
      const loadedRuns = runsPayload?.runs ?? []
      const loadedEmployees = employeesPayload?.employees ?? []
      setSettings((prev) => ({ ...prev, ...loadedSettings }))
      setRuns(loadedRuns)
      setEmployees(loadedEmployees)

      const today = new Date()
      const endDate = (loadedSettings.payroll_next_run_date || today.toISOString().slice(0, 10)) as string
      const latestRun = loadedRuns?.[0] as PayrollRun | undefined
      const addDays = (dateStr: string, days: number) => {
        const base = new Date(dateStr)
        base.setDate(base.getDate() + days)
        return base.toISOString().slice(0, 10)
      }
      let startDate = endDate
      if (latestRun?.run_date) {
        startDate = addDays(latestRun.run_date, 1)
      } else {
        const freq = loadedSettings.payroll_frequency || 'monthly'
        const offset = freq === 'bi-weekly' ? -14 : -30
        startDate = addDays(endDate, offset)
      }

      const summaryRes = await fetch(`/api/time/summary?start=${startDate}&end=${endDate}`)
      if (summaryRes.ok) {
        const summaryPayload = await summaryRes.json().catch(() => null)
        const summaryMap: Record<string, number> = {}
        ;(summaryPayload?.summary ?? []).forEach((row: { full_name: string; minutes: number }) => {
          summaryMap[row.full_name.toLowerCase()] = row.minutes
        })
        setTimeSummary(summaryMap)
        setItems(
          loadedEmployees.map((employee: Employee) => {
            const minutes = summaryMap[employee.full_name.toLowerCase()] ?? 0
            const hours = minutes / 60
            const rate = Number(employee.hourly_rate) || 0
            const gross = rate > 0 && hours > 0 ? (hours * rate).toFixed(2) : ''
            return {
              employeeId: employee.id,
              gross,
              tax: '',
              deductions: '',
            }
          }),
        )
      } else {
        setItems(
          loadedEmployees.map((employee: Employee) => ({
            employeeId: employee.id,
            gross: '',
            tax: '',
            deductions: '',
          })),
        )
      }

      setStatus('idle')
    }
    load()
  }, [])

  const totals = useMemo(() => {
    const mapped = items.map((item) => ({
      gross: Number(item.gross) || 0,
      tax: Number(item.tax) || 0,
      deductions: Number(item.deductions) || 0,
    }))
    return {
      gross: mapped.reduce((sum, item) => sum + item.gross, 0),
      tax: mapped.reduce((sum, item) => sum + item.tax, 0),
      deductions: mapped.reduce((sum, item) => sum + item.deductions, 0),
      net: mapped.reduce((sum, item) => sum + (item.gross - item.tax - item.deductions), 0),
    }
  }, [items])

  const updateItem = (employeeId: string, key: keyof PayrollItemInput, value: string) => {
    setItems((prev) => prev.map((item) => item.employeeId === employeeId ? { ...item, [key]: value } : item))
  }

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (!settings.payroll_frequency || !settings.payroll_currency) {
      setError('Payroll frequency and currency are required.')
      return
    }
    if (settings.payroll_frequency === 'flexible' && !settings.payroll_next_run_date) {
      setError('Next pay run date is required for flexible frequency.')
      return
    }
    setStatus('saving')
    const response = await fetch('/api/payroll/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setStatus('idle')
      setError(payload?.message ?? 'Unable to save payroll settings.')
      return
    }
    const payload = await response.json().catch(() => null)
    setSettings((prev) => ({ ...prev, ...(payload?.settings ?? {}) }))
    setStatus('idle')
    setSaved(true)
  }

  const createRun = async () => {
    setError(null)
    const runDate = settings.payroll_next_run_date || new Date().toISOString().slice(0, 10)
    const payloadItems = items
      .map((item) => ({
        employeeId: item.employeeId,
        gross: Number(item.gross),
        tax: Number(item.tax),
        deductions: Number(item.deductions),
      }))
      .filter((item) => Number.isFinite(item.gross) && item.gross > 0)

    if (payloadItems.length === 0) {
      setError('Enter gross amounts for at least one employee.')
      return
    }

    setStatus('saving')
    const response = await fetch('/api/payroll/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runDate,
        frequency: settings.payroll_frequency ?? 'monthly',
        currency: settings.payroll_currency ?? 'EUR',
        items: payloadItems,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setStatus('idle')
      setError(payload?.message ?? 'Unable to create payroll run.')
      return
    }

    const runsRes = await fetch('/api/payroll/runs')
    if (runsRes.ok) {
      const payload = await runsRes.json().catch(() => null)
      setRuns(payload?.runs ?? [])
    }
    setStatus('idle')
  }

  return (
    <>
      <Head>
        <title>Payroll</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>Payroll</h1>
              <p>Configure pay runs and generate payroll summaries.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
          </div>
        </header>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Payroll settings</h2>
            </div>
            {status === 'loading' && <p className="section-subtitle">Loading payroll settings…</p>}
            {status !== 'loading' && (
              <form className="setup-form" onSubmit={saveSettings}>
                <div className="form-grid">
                  <label className="field">
                    <span>Frequency</span>
                    <select
                      value={settings.payroll_frequency ?? 'monthly'}
                      onChange={(event) => setSettings((prev) => ({ ...prev, payroll_frequency: event.target.value }))}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="flexible">Flexible (choose date)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Currency</span>
                    <select
                      value={settings.payroll_currency ?? 'EUR'}
                      onChange={(event) => setSettings((prev) => ({ ...prev, payroll_currency: event.target.value }))}
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Next run date</span>
                    <input
                      type="date"
                      value={settings.payroll_next_run_date ?? ''}
                      onChange={(event) => setSettings((prev) => ({ ...prev, payroll_next_run_date: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="setup-actions">
                  <button className="btn primary" type="submit" disabled={status === 'saving'}>
                    {status === 'saving' ? 'Saving...' : 'Save settings'}
                  </button>
                </div>
                {saved && <p className="form-note">Settings saved.</p>}
              </form>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Create pay run</h2>
            </div>
            {employees.length === 0 ? (
              <p className="section-subtitle">Add employees before creating a pay run.</p>
            ) : (
              <>
                <div className="invoice-list">
                  {employees.map((employee) => {
                    const entry = items.find((item) => item.employeeId === employee.id)
                    const minutes = timeSummary[employee.full_name.toLowerCase()] ?? 0
                    const rate = Number(employee.hourly_rate) || 0
                    const hours = minutes / 60
                    return (
                      <div className="invoice-row" key={employee.id}>
                        <div>
                          <strong>{employee.full_name}</strong>
                          <span>{employee.team || 'Team'} · {employee.role || 'Role'}</span>
                          <span>
                            {rate > 0 ? `Rate ${formatAmount(rate, settings.payroll_currency ?? 'EUR')}/hr` : 'No rate'}
                            {minutes > 0 ? ` · ${hours.toFixed(2)}h logged` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 120px)' }}>
                          <input
                            className="line-input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Gross"
                            value={entry?.gross ?? ''}
                            onChange={(event) => updateItem(employee.id, 'gross', event.target.value)}
                          />
                          <input
                            className="line-input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Tax"
                            value={entry?.tax ?? ''}
                            onChange={(event) => updateItem(employee.id, 'tax', event.target.value)}
                          />
                          <input
                            className="line-input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Deductions"
                            value={entry?.deductions ?? ''}
                            onChange={(event) => updateItem(employee.id, 'deductions', event.target.value)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="invoice-list" style={{ marginTop: 12 }}>
                  <div className="invoice-row">
                    <div>
                      <strong>Total gross</strong>
                    </div>
                    <div className="invoice-meta">
                      <span>{formatAmount(totals.gross, settings.payroll_currency ?? 'EUR')}</span>
                    </div>
                  </div>
                  <div className="invoice-row">
                    <div>
                      <strong>Total tax</strong>
                    </div>
                    <div className="invoice-meta">
                      <span>{formatAmount(totals.tax, settings.payroll_currency ?? 'EUR')}</span>
                    </div>
                  </div>
                  <div className="invoice-row">
                    <div>
                      <strong>Total deductions</strong>
                    </div>
                    <div className="invoice-meta">
                      <span>{formatAmount(totals.deductions, settings.payroll_currency ?? 'EUR')}</span>
                    </div>
                  </div>
                  <div className="invoice-row">
                    <div>
                      <strong>Total net</strong>
                    </div>
                    <div className="invoice-meta">
                      <span>{formatAmount(totals.net, settings.payroll_currency ?? 'EUR')}</span>
                    </div>
                  </div>
                </div>

                <div className="setup-actions">
                  <button className="btn primary" type="button" onClick={createRun} disabled={status === 'saving'}>
                    {status === 'saving' ? 'Creating...' : 'Create pay run'}
                  </button>
                </div>
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recent pay runs</h2>
            </div>
            <div className="invoice-list">
              {runs.length === 0 && <p className="section-subtitle">No payroll runs yet.</p>}
              {runs.map((run) => (
                <div className="invoice-row" key={run.id}>
                  <div>
                    <strong>{run.run_date}</strong>
                    <span>{run.frequency} · {run.status}</span>
                  </div>
                  <div className="invoice-meta">
                    <span>{formatAmount(Number(run.total_net), run.currency)}</span>
                    <span>{run.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
