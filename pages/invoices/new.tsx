import Head from 'next/head'
import React, { useEffect, useMemo, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type ClientOption = {
  id: string
  name: string
  email: string | null
}

type LineItem = {
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
  discountRate: string
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

const emptyItem = (): LineItem => ({
  description: '',
  quantity: '1',
  unitPrice: '',
  taxRate: '0',
  discountRate: '0',
})

export default function NewInvoice(): JSX.Element {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    dueDate: '',
    notes: '',
    currency: 'EUR',
    saveClient: true,
  })
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClients = async () => {
      const response = await fetch('/api/clients/list')
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      setClients(payload?.clients ?? [])
    }
    loadClients()
  }, [])

  useEffect(() => {
    if (!clientId) return
    const selected = clients.find((client) => client.id === clientId)
    if (!selected) return
    setForm((prev) => ({
      ...prev,
      clientName: selected.name,
      clientEmail: selected.email ?? prev.clientEmail,
      saveClient: false,
    }))
  }, [clientId, clients])

  const totals = useMemo(() => {
    const parsed = items.map((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice)
      const taxRate = Number(item.taxRate)
      const discountRate = Number(item.discountRate)
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
        return { subtotal: 0, tax: 0, discount: 0, total: 0 }
      }
      const lineSubtotal = quantity * unitPrice
      const discount = lineSubtotal * (discountRate / 100)
      const taxable = lineSubtotal - discount
      const tax = taxable * (taxRate / 100)
      return {
        subtotal: lineSubtotal,
        discount,
        tax,
        total: taxable + tax,
      }
    })
    return {
      subtotal: parsed.reduce((sum, item) => sum + item.subtotal, 0),
      discount: parsed.reduce((sum, item) => sum + item.discount, 0),
      tax: parsed.reduce((sum, item) => sum + item.tax, 0),
      total: parsed.reduce((sum, item) => sum + item.total, 0),
    }
  }, [items])

  const formatAmount = (amount: number) => {
    const symbol = form.currency === 'EUR' ? '€' : form.currency === 'USD' ? '$' : ''
    return `${symbol}${amount.toFixed(2)}`
  }

  const updateItem = (index: number, key: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, [key]: value } : item))
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, idx) => idx !== index))

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

    const payloadItems = items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      discountRate: Number(item.discountRate),
    }))

    if (payloadItems.some((item) => !item.description || item.quantity <= 0 || !Number.isFinite(item.unitPrice))) {
      setError('Please complete all line items with valid values.')
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId || null,
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          saveClient: form.saveClient,
          dueDate: form.dueDate || null,
          notes: form.notes,
          currency: form.currency,
          items: payloadItems,
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
            Add line items, pick a client, and we will email a PDF invoice once it is created.
          </p>

          <form className="setup-form" onSubmit={submitInvoice}>
            <div className="form-grid">
              <label className="field">
                <span>Saved client</span>
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                >
                  <option value="">New client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
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
                <span>Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Currency</span>
                <select
                  value={form.currency}
                  onChange={(event) => setForm({ ...form, currency: event.target.value })}
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </label>
              <label className="field">
                <span>Save as recurring client</span>
                <select
                  value={form.saveClient ? 'yes' : 'no'}
                  onChange={(event) => setForm({ ...form, saveClient: event.target.value === 'yes' })}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Line items</h2>
                <button className="btn ghost" type="button" onClick={addItem}>Add item</button>
              </div>
              <div className="invoice-list">
                {items.map((item, index) => (
                  <div className="invoice-row" key={`item-${index}`}>
                    <div style={{ flex: 1, display: 'grid', gap: 10, gridTemplateColumns: '2fr 0.7fr 0.8fr 0.8fr 0.8fr' }}>
                      <input
                        className="line-input"
                        placeholder="Description"
                        value={item.description}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                      />
                      <input
                        className="line-input"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      />
                      <input
                        className="line-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                      />
                      <input
                        className="line-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Tax %"
                        value={item.taxRate}
                        onChange={(event) => updateItem(index, 'taxRate', event.target.value)}
                      />
                      <input
                        className="line-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Discount %"
                        value={item.discountRate}
                        onChange={(event) => updateItem(index, 'discountRate', event.target.value)}
                      />
                    </div>
                    <button className="btn" type="button" disabled={items.length === 1} onClick={() => removeItem(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Notes</span>
              <input
                placeholder="Optional note for the invoice email."
                type="text"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>

            <div className="panel">
              <div className="panel-header">
                <h2>Totals</h2>
              </div>
              <div className="invoice-list">
                <div className="invoice-row">
                  <div>
                    <strong>Subtotal</strong>
                    <span>Before discounts and tax</span>
                  </div>
                  <div className="invoice-meta">
                    <span>{formatAmount(totals.subtotal)}</span>
                  </div>
                </div>
                <div className="invoice-row">
                  <div>
                    <strong>Discounts</strong>
                    <span>Combined discounts</span>
                  </div>
                  <div className="invoice-meta">
                    <span>-{formatAmount(totals.discount)}</span>
                  </div>
                </div>
                <div className="invoice-row">
                  <div>
                    <strong>Tax</strong>
                    <span>Total tax applied</span>
                  </div>
                  <div className="invoice-meta">
                    <span>{formatAmount(totals.tax)}</span>
                  </div>
                </div>
                <div className="invoice-row">
                  <div>
                    <strong>Total</strong>
                    <span>Amount due</span>
                  </div>
                  <div className="invoice-meta">
                    <span>{formatAmount(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

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
