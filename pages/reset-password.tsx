import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../lib/supabaseServer'
import { getSupabaseBrowser } from '../lib/supabaseClient'

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

  return { props: {} }
}

export default function ResetPassword(): JSX.Element {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    setError(null)
  }, [password, confirmPassword])

  const submitReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setStatus('submitting')
    try {
      const supabase = getSupabaseBrowser()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        throw updateError
      }
      setStatus('success')
      setCountdown(4)
      setPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setStatus('idle')
      setError('Unable to update your password. Please try again.')
    }
  }

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      window.location.href = '/login'
      return
    }
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  return (
    <>
      <Head>
        <title>Set a new password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="auth-page">
        <section className="auth-panel">
          <div className="container auth-container">
            <div className="auth-card">
              <h1>Set a new password</h1>
              <p>Choose a new password for your Lumix account.</p>
              <form className="auth-form" onSubmit={submitReset}>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    placeholder="Create a new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>
                <button className="btn primary" type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Updating...' : 'Update password'}
                </button>
                {error && <p className="form-error" role="alert">{error}</p>}
                {status === 'success' && (
                  <p className="form-note">
                    Password updated. Redirecting to login{countdown !== null ? ` in ${countdown}s` : ''}.
                  </p>
                )}
              </form>
              <div className="auth-footer">
                <a href="/login">Back to login</a>
              </div>
            </div>

            <div className="auth-aside">
              <h2>Security first</h2>
              <p>We recommend using a strong password you do not reuse anywhere else.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
