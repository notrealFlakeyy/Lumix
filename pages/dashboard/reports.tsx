import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type SellerRow = {
  name: string
  units: number
  revenue: number
}

type ReportData = {
  bestSellers: SellerRow[]
  worstSellers: SellerRow[]
  avgUnitPrice: number
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

const formatAmount = (amount: number) => `€${amount.toFixed(2)}`

export default function ReportsPage(): JSX.Element {
  const [data, setData] = useState<ReportData | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      const response = await fetch('/api/reports/sales')
      if (!response.ok) {
        setStatus('error')
        return
      }
      const payload = await response.json().catch(() => null)
      setData(payload)
      setStatus('idle')
    }
    load()
  }, [])

  return (
    <>
      <Head>
        <title>Reports</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>Reports</h1>
              <p>Track sales performance and product trends.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
          </div>
        </header>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Average unit price</h2>
            </div>
            {status === 'loading' && <p className="section-subtitle">Loading report data…</p>}
            {status === 'error' && <p className="form-error">Could not load report data.</p>}
            {data && <strong style={{ fontSize: '1.6rem' }}>{formatAmount(data.avgUnitPrice)}</strong>}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Best sellers</h2>
            </div>
            {data?.bestSellers?.length ? (
              <div className="invoice-list">
                {data.bestSellers.map((item) => (
                  <div className="invoice-row" key={`best-${item.name}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.units} units</span>
                    </div>
                    <div className="invoice-meta">
                      <span>{formatAmount(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="section-subtitle">No sales data yet.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Worst sellers</h2>
            </div>
            {data?.worstSellers?.length ? (
              <div className="invoice-list">
                {data.worstSellers.map((item) => (
                  <div className="invoice-row" key={`worst-${item.name}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.units} units</span>
                    </div>
                    <div className="invoice-meta">
                      <span>{formatAmount(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="section-subtitle">No sales data yet.</p>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
