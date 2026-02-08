import Head from 'next/head'
import React, { useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseBrowser } from '../lib/supabaseClient'
import { getSupabaseServer } from '../lib/supabaseServer'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const supabase = getSupabaseServer({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }

  return { props: {} }
}

export default function Login(): JSX.Element {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setStatus('submitting')
    try {
      const supabase = getSupabaseBrowser()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInError) {
        throw signInError
      }
      window.location.href = '/dashboard'
    } catch (requestError) {
      setStatus('idle')
      setError('Unable to sign in with those details.')
    }
  }

  return (
    <>
      <Head>
        <title>Log in to Lumix</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="auth-page">
        <section className="auth-panel">
          <div className="container auth-container">
            <div className="auth-card">
              <h1>Welcome back</h1>
              <p>Log in to access your dashboard, invoices, and payroll.</p>
              <form className="auth-form" onSubmit={submitLogin}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required
                  />
                </label>
                <button className="btn primary" type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Signing in...' : 'Log in'}
                </button>
                {error && <p className="form-error" role="alert">{error}</p>}
              </form>
              <div className="auth-footer">
                <span>New here?</span>
                <a href="/signup">Create an account</a>
              </div>
            </div>

            <div className="auth-aside">
              <h2>Instant visibility</h2>
              <p>Track cash flow, invoices, and payroll in a single workspace built for growing teams.</p>
              <div className="aside-metrics">
                <div>
                  <strong>$128,400</strong>
                  <span>Receivables</span>
                </div>
                <div>
                  <strong>32</strong>
                  <span>Open invoices</span>
                </div>
                <div>
                  <strong>4.7 days</strong>
                  <span>Avg. payment time</span>
                </div>
              </div>
              <a className="btn ghost" href="/">Back to home</a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
