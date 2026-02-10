import Head from 'next/head'
import React, { useState } from 'react'
import { getSupabaseBrowser } from '../lib/supabaseClient'

export default function ForgotPassword(): JSX.Element {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submitReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setStatus('submitting')
    try {
      const supabase = getSupabaseBrowser()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/api/auth/callback?type=recovery`,
      })
      if (resetError) {
        throw resetError
      }
      setStatus('success')
    } catch (requestError) {
      setStatus('idle')
      setError('Unable to send reset email. Please try again.')
    }
  }

  return (
    <>
      <Head>
        <title>Reset your password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="auth-page">
        <section className="auth-panel">
          <div className="container auth-container">
            <div className="auth-card">
              <h1>Reset your password</h1>
              <p>Enter your account email and we will send you a reset link.</p>
              <form className="auth-form" onSubmit={submitReset}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <button className="btn primary" type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending...' : 'Send reset link'}
                </button>
                {error && <p className="form-error" role="alert">{error}</p>}
                {status === 'success' && (
                  <p className="form-note">Check your inbox for the reset link.</p>
                )}
              </form>
              <div className="auth-footer">
                <a href="/login">Back to login</a>
              </div>
            </div>

            <div className="auth-aside">
              <h2>Secure recovery</h2>
              <p>We will send a secure reset link to confirm your identity before updating your password.</p>
              <a className="btn ghost" href="/login">Return to login</a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
