import Head from 'next/head'
import React from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type InvoiceRow = {
  id: string
  client: string
  invoice_number: string
  due_date: string | null
  amount: number
  currency: string
  status: 'pending' | 'overdue' | 'paid'
  created_at: string
}

type InvoicesPageProps = {
  invoices: InvoiceRow[]
  role: 'admin' | 'manager' | 'viewer'
}

const formatAmount = (amount: number, currency: string) => {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : ''
  return `${symbol}${Number(amount || 0).toLocaleString()}`
}

export const getServerSideProps: GetServerSideProps<InvoicesPageProps> = async ({ req, res }) => {
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
    .select('company_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return {
      redirect: {
        destination: '/signup',
        permanent: false,
      },
    }
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, client, invoice_number, due_date, amount, currency, status, created_at')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  return {
    props: {
      invoices: (invoices ?? []) as InvoiceRow[],
      role: (profile.role ?? 'viewer') as 'admin' | 'manager' | 'viewer',
    },
  }
}

export default function DashboardInvoices({ invoices, role }: InvoicesPageProps): JSX.Element {
  const canManage = role === 'admin' || role === 'manager'

  return (
    <>
      <Head>
        <title>Invoices</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>All invoices</h1>
              <p>Review invoice status, due dates, and totals across your company.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
              <a className={`btn primary${canManage ? '' : ' disabled'}`} href={canManage ? '/invoices/new' : '#'} aria-disabled={!canManage}>
                New invoice
              </a>
            </div>
          </div>
        </header>

        <section className="container">
          <div className="panel">
            <div className="panel-header">
              <h2>Invoice list</h2>
              <span>{invoices.length} total</span>
            </div>

            <div className="invoice-list">
              {invoices.length === 0 && (
                <p className="section-subtitle">No invoices yet. Create your first invoice to get started.</p>
              )}
              {invoices.map((invoice) => (
                <div className="invoice-row" key={invoice.id}>
                  <div>
                    <strong>{invoice.client}</strong>
                    <span>
                      {invoice.invoice_number} · {invoice.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : 'No due date'}
                    </span>
                  </div>
                  <div className="invoice-meta">
                    <span>{formatAmount(invoice.amount, invoice.currency || 'EUR')}</span>
                    <span className={`status ${invoice.status}`}>{invoice.status}</span>
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
