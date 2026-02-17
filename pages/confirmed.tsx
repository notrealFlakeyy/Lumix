import Head from 'next/head'
import React from 'react'

export default function Confirmed(): JSX.Element {
  return (
    <>
      <Head>
        <title>Email confirmed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="auth-page">
        <section className="auth-panel">
          <div className="container auth-container">
            <div className="auth-card">
              <h1>Email confirmed</h1>
              <p>Your email has been verified. You can now log in and access your dashboard.</p>
              <div className="setup-actions">
                <a className="btn primary" href="/login?created=1">Continue to log in</a>
                <a className="btn ghost" href="/">Back to home</a>
              </div>
            </div>

            <div className="auth-aside">
              <h2>You're all set</h2>
              <p>We have activated your Lumix workspace. Log in to start sending invoices and managing payroll.</p>
              <a className="btn ghost" href="/login?created=1">Go to login</a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
