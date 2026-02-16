import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type CompanyForm = {
  name: string
  contact_email: string
  contact_phone: string
  contact_address: string
  contact_city: string
  contact_postal_code: string
  contact_country: string
  billing_email: string
  billing_address: string
  vat_id: string
  kpi_cash_label: string
  kpi_cash_note: string
  kpi_outstanding_label: string
  kpi_outstanding_note: string
  kpi_payroll_label: string
  kpi_payroll_note: string
  kpi_employees_label: string
  kpi_employees_note: string
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

const emptyForm = (): CompanyForm => ({
  name: '',
  contact_email: '',
  contact_phone: '',
  contact_address: '',
  contact_city: '',
  contact_postal_code: '',
  contact_country: '',
  billing_email: '',
  billing_address: '',
  vat_id: '',
  kpi_cash_label: '',
  kpi_cash_note: '',
  kpi_outstanding_label: '',
  kpi_outstanding_note: '',
  kpi_payroll_label: '',
  kpi_payroll_note: '',
  kpi_employees_label: '',
  kpi_employees_note: '',
})

export default function SettingsPage(): JSX.Element {
  const [form, setForm] = useState<CompanyForm>(emptyForm())
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      const response = await fetch('/api/company/get')
      if (!response.ok) {
        setStatus('idle')
        setError('Unable to load company profile.')
        return
      }
      const payload = await response.json().catch(() => null)
      setForm((prev) => ({ ...prev, ...(payload?.company ?? {}) }))
      setStatus('idle')
    }
    load()
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (!form.name.trim()) {
      setError('Company name is required.')
      return
    }
    setStatus('saving')
    const response = await fetch('/api/company/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setStatus('idle')
      setError(payload?.message ?? 'Unable to save company settings.')
      return
    }
    const payload = await response.json().catch(() => null)
    setForm((prev) => ({ ...prev, ...(payload?.company ?? {}) }))
    setStatus('idle')
    setSaved(true)
  }

  return (
    <>
      <Head>
        <title>Settings</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>Settings</h1>
              <p>Update company profile, billing, and contact information.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
          </div>
        </header>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Company profile</h2>
            </div>
            {status === 'loading' && <p className="section-subtitle">Loading company profile…</p>}
            {status !== 'loading' && (
              <form className="setup-form" onSubmit={submit}>
                <div className="form-grid">
                  <label className="field">
                    <span>Company name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>VAT ID</span>
                    <input
                      type="text"
                      value={form.vat_id}
                      onChange={(event) => setForm({ ...form, vat_id: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Contact email</span>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(event) => setForm({ ...form, contact_email: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Contact phone</span>
                    <input
                      type="text"
                      value={form.contact_phone}
                      onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Contact address</span>
                    <input
                      type="text"
                      value={form.contact_address}
                      onChange={(event) => setForm({ ...form, contact_address: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>City</span>
                    <input
                      type="text"
                      value={form.contact_city}
                      onChange={(event) => setForm({ ...form, contact_city: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Postal code</span>
                    <input
                      type="text"
                      value={form.contact_postal_code}
                      onChange={(event) => setForm({ ...form, contact_postal_code: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Country</span>
                    <input
                      type="text"
                      value={form.contact_country}
                      onChange={(event) => setForm({ ...form, contact_country: event.target.value })}
                    />
                  </label>
                </div>

                <div className="panel" style={{ marginTop: 20 }}>
                  <div className="panel-header">
                    <h2>Billing details</h2>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Billing email</span>
                      <input
                        type="email"
                        value={form.billing_email}
                        onChange={(event) => setForm({ ...form, billing_email: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Billing address</span>
                      <input
                        type="text"
                        value={form.billing_address}
                        onChange={(event) => setForm({ ...form, billing_address: event.target.value })}
                      />
                    </label>
                  </div>
                </div>

                <div className="panel" style={{ marginTop: 20 }}>
                  <div className="panel-header">
                    <h2>Dashboard KPI labels</h2>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Cash label</span>
                      <input
                        type="text"
                        value={form.kpi_cash_label}
                        onChange={(event) => setForm({ ...form, kpi_cash_label: event.target.value })}
                        placeholder="Cash balance"
                      />
                    </label>
                    <label className="field">
                      <span>Cash note</span>
                      <input
                        type="text"
                        value={form.kpi_cash_note}
                        onChange={(event) => setForm({ ...form, kpi_cash_note: event.target.value })}
                        placeholder="Updated daily"
                      />
                    </label>
                    <label className="field">
                      <span>Outstanding label</span>
                      <input
                        type="text"
                        value={form.kpi_outstanding_label}
                        onChange={(event) => setForm({ ...form, kpi_outstanding_label: event.target.value })}
                        placeholder="Outstanding invoices"
                      />
                    </label>
                    <label className="field">
                      <span>Outstanding note</span>
                      <input
                        type="text"
                        value={form.kpi_outstanding_note}
                        onChange={(event) => setForm({ ...form, kpi_outstanding_note: event.target.value })}
                        placeholder="{count} invoices open"
                      />
                    </label>
                    <label className="field">
                      <span>Payroll label</span>
                      <input
                        type="text"
                        value={form.kpi_payroll_label}
                        onChange={(event) => setForm({ ...form, kpi_payroll_label: event.target.value })}
                        placeholder="Payroll scheduled"
                      />
                    </label>
                    <label className="field">
                      <span>Payroll note</span>
                      <input
                        type="text"
                        value={form.kpi_payroll_note}
                        onChange={(event) => setForm({ ...form, kpi_payroll_note: event.target.value })}
                        placeholder="Next run on {payrollDate}"
                      />
                    </label>
                    <label className="field">
                      <span>Employees label</span>
                      <input
                        type="text"
                        value={form.kpi_employees_label}
                        onChange={(event) => setForm({ ...form, kpi_employees_label: event.target.value })}
                        placeholder="Active employees"
                      />
                    </label>
                    <label className="field">
                      <span>Employees note</span>
                      <input
                        type="text"
                        value={form.kpi_employees_note}
                        onChange={(event) => setForm({ ...form, kpi_employees_note: event.target.value })}
                        placeholder="Active seats"
                      />
                    </label>
                  </div>
                </div>

                <div className="setup-actions">
                  <button className="btn primary" type="submit" disabled={status === 'saving'}>
                    {status === 'saving' ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
                {saved && <p className="form-note">Settings saved.</p>}
                {error && <p className="form-error" role="alert">{error}</p>}
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
