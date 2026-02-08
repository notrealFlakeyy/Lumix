import Head from 'next/head'
import React, { useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

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

export default function NewInvoice(): JSX.Element {
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    amount: '',
    dueDate: '',
    notes: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submitInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.clientName.trim()) {
      setError('Please enter the client name.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.clientEmail)) {
      setError('Please enter a valid client email.')
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          amount: Number(form.amount),
          dueDate: form.dueDate || null,
          notes: form.notes,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Unable to create invoice.')
      }

      setStatus('success')
    } catch (requestError) {
      setStatus('idle')
      setError(requestError instanceof Error ? requestError.message : 'Unable to create invoice.')
    }
  }

  return (
    <>
      <Head>
        <title>Create invoice</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="setup">
        <section className="container">
          <h1 className="section-title">Create a new invoice</h1>
          <p className="section-subtitle">
            Add the client details below and we will email them the invoice once it is created.
          </p>

          <form className="setup-form" onSubmit={submitInvoice}>
            <div className="form-grid">
              <label className="field">
                <span>Client name</span>
                <input
                  placeholder="Acme Co."
                  type="text"
                  value={form.clientName}
                  onChange={(event) => setForm({ ...form, clientName: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Client email</span>
                <input
                  placeholder="billing@acme.com"
                  type="email"
                  value={form.clientEmail}
                  onChange={(event) => setForm({ ...form, clientEmail: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Invoice amount</span>
                <input
                  placeholder="2500"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <input
                placeholder="Placeholder note for the invoice email."
                type="text"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>

            <div className="setup-actions">
              <button className="btn primary" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Sending...' : 'Create & send invoice'}
              </button>
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {status === 'success' && <p className="form-note">Invoice created and email sent.</p>}
          </form>
        </section>
      </main>
    </>
  )
}
