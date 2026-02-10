import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type TimeEntry = {
  id: string
  user_id: string
  start_time: string
  end_time: string | null
  duration_minutes: number
  break_minutes: number
  net_minutes: number
  status: string
}

type StatusPayload = {
  openEntry: { id: string; start_time: string } | null
  openBreak: { id: string; start_time: string } | null
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

  return { props: {} }
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export default function TimePage(): JSX.Element {
  const [status, setStatus] = useState<StatusPayload>({ openEntry: null, openBreak: null })
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [statusRes, entriesRes] = await Promise.all([
      fetch('/api/time/status'),
      fetch('/api/time/entries'),
    ])
    if (statusRes.ok) {
      const payload = await statusRes.json().catch(() => null)
      setStatus(payload ?? { openEntry: null, openBreak: null })
    }
    if (entriesRes.ok) {
      const payload = await entriesRes.json().catch(() => null)
      setEntries(payload?.entries ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const callAction = async (endpoint: string) => {
    setError(null)
    const response = await fetch(endpoint, { method: 'POST' })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.message ?? 'Action failed.')
      return
    }
    await load()
  }

  return (
    <>
      <Head>
        <title>Time tracking</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>Time tracking</h1>
              <p>Clock in/out, track breaks, and review recent entries.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
          </div>
        </header>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Clock controls</h2>
            </div>
            {loading && <p className="section-subtitle">Loading status…</p>}
            {!loading && (
              <>
                <div className="setup-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => callAction('/api/time/clock-in')}
                    disabled={!!status.openEntry}
                  >
                    Clock in
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => callAction('/api/time/clock-out')}
                    disabled={!status.openEntry}
                  >
                    Clock out
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => callAction('/api/time/break-start')}
                    disabled={!status.openEntry || !!status.openBreak}
                  >
                    Start break
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => callAction('/api/time/break-end')}
                    disabled={!status.openBreak}
                  >
                    End break
                  </button>
                </div>
                {status.openEntry && (
                  <p className="section-subtitle">
                    Clocked in at {new Date(status.openEntry.start_time).toLocaleTimeString()}.
                  </p>
                )}
                {status.openBreak && (
                  <p className="section-subtitle">
                    On break since {new Date(status.openBreak.start_time).toLocaleTimeString()}.
                  </p>
                )}
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recent entries</h2>
              <button className="btn ghost" type="button" onClick={load} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="invoice-list">
              {entries.length === 0 && (
                <p className="section-subtitle">No time entries yet.</p>
              )}
              {entries.map((entry) => (
                <div className="invoice-row" key={entry.id}>
                  <div>
                    <strong>{new Date(entry.start_time).toLocaleDateString()}</strong>
                    <span>
                      {new Date(entry.start_time).toLocaleTimeString()} → {entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'Open'}
                    </span>
                    <span>Status: {entry.status}</span>
                  </div>
                  <div className="invoice-meta">
                    <span>Net {formatMinutes(entry.net_minutes)}</span>
                    <span>Break {formatMinutes(entry.break_minutes)}</span>
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
