import Head from 'next/head'
import React from 'react'
import { useRouter } from 'next/router'

const copy: Record<string, { title: string; body: string }> = {
  auth: {
    title: 'Something went wrong',
    body: 'We could not verify your session. Please log in again.',
  },
}

export default function ErrorPage(): JSX.Element {
  const router = useRouter()
  const reason = typeof router.query.reason === 'string' ? router.query.reason : 'auth'
  const content = copy[reason] ?? copy.auth

  return (
    <>
      <Head>
        <title>{content.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="auth-page">
        <section className="auth-panel">
          <div className="container auth-container">
            <div className="auth-card">
              <h1>{content.title}</h1>
              <p>{content.body}</p>
              <div className="setup-actions">
                <a className="btn primary" href="/login">Go to login</a>
                <a className="btn ghost" href="/">Back to home</a>
              </div>
            </div>

            <div className="auth-aside">
              <h2>Need help?</h2>
              <p>If this keeps happening, contact support and we will help you regain access.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
