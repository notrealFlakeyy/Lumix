import Head from 'next/head'
import React, { useState } from 'react'

export default function Signup(): JSX.Element {
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    size: '',
    region: '',
  })
  const [features, setFeatures] = useState<string[]>(['invoicing', 'bank-sync'])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  const toggleFeature = (feature: string) => {
    setFeatures((prev) => (prev.includes(feature) ? prev.filter((item) => item !== feature) : [...prev, feature]))
  }

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!form.businessName.trim()) {
      setError('Please enter your business name.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!form.size) {
      setError('Please select a company size.')
      return
    }
    if (!form.region) {
      setError('Please select a region.')
      return
    }
    if (features.length === 0) {
      setError('Please choose at least one feature.')
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, features }),
      })
      if (!response.ok) {
        throw new Error('Request failed')
      }
      setStatus('success')
    } catch (requestError) {
      setStatus('idle')
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <>
      <Head>
        <title>Set up your Lumix account</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="signup-page">
        <section className="setup">
          <div className="container">
            <h1 className="section-title">Create your Lumix account</h1>
            <p className="section-subtitle">Share a few details so we can tailor your workspace.</p>

            <form className="setup-form" onSubmit={submitSignup}>
              <div className="form-grid">
                <label className="field">
                  <span>Business name</span>
                  <input
                    placeholder="Lumix Coffee Co."
                    type="text"
                    value={form.businessName}
                    onChange={(event) => setForm({ ...form, businessName: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Work email</span>
                  <input
                    placeholder="you@company.com"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Company size</span>
                  <select
                    required
                    value={form.size}
                    onChange={(event) => setForm({ ...form, size: event.target.value })}
                  >
                    <option value="" disabled>Select size</option>
                    <option value="1-5">1-5 people</option>
                    <option value="6-20">6-20 people</option>
                    <option value="21-100">21-100 people</option>
                    <option value="100+">100+ people</option>
                  </select>
                </label>
                <label className="field">
                  <span>Primary region</span>
                  <select
                    required
                    value={form.region}
                    onChange={(event) => setForm({ ...form, region: event.target.value })}
                  >
                    <option value="" disabled>Select region</option>
                    <option value="north-america">North America</option>
                    <option value="europe">Europe</option>
                    <option value="uk">United Kingdom</option>
                    <option value="apac">Asia-Pacific</option>
                  </select>
                </label>
              </div>

              <div className="feature-grid">
                <label className="check-card">
                  <input
                    type="checkbox"
                    checked={features.includes('invoicing')}
                    onChange={() => toggleFeature('invoicing')}
                  />
                  <div>
                    <strong>Invoicing</strong>
                    <span>Send branded invoices and reminders.</span>
                  </div>
                </label>
                <label className="check-card">
                  <input
                    type="checkbox"
                    checked={features.includes('bank-sync')}
                    onChange={() => toggleFeature('bank-sync')}
                  />
                  <div>
                    <strong>Bank sync</strong>
                    <span>Connect accounts for auto-categorization.</span>
                  </div>
                </label>
                <label className="check-card">
                  <input
                    type="checkbox"
                    checked={features.includes('payroll')}
                    onChange={() => toggleFeature('payroll')}
                  />
                  <div>
                    <strong>Payroll</strong>
                    <span>Run payroll and automate tax reports.</span>
                  </div>
                </label>
                <label className="check-card">
                  <input
                    type="checkbox"
                    checked={features.includes('expense-cards')}
                    onChange={() => toggleFeature('expense-cards')}
                  />
                  <div>
                    <strong>Expense cards</strong>
                    <span>Issue cards with spend controls.</span>
                  </div>
                </label>
              </div>

              <div className="setup-actions">
                <button className="btn primary" type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting...' : 'Create account'}
                </button>
                <a className="btn ghost" href="/">Back to home</a>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              {status === 'success' && <p className="form-note">Thanks! We will email your setup details shortly.</p>}
            </form>
          </div>
        </section>
      </main>
    </>
  )
}
