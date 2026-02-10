import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
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

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  address: '',
})

export default function ClientsPage(): JSX.Element {
  const [clients, setClients] = useState<Client[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const loadClients = async () => {
    setStatus('loading')
    const response = await fetch('/api/clients/list')
    if (!response.ok) {
      setStatus('idle')
      setError('Unable to load clients.')
      return
    }
    const payload = await response.json().catch(() => null)
    setClients(payload?.clients ?? [])
    setStatus('idle')
  }

  useEffect(() => {
    loadClients()
  }, [])

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setForm({
      name: client.name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const submitClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Client name is required.')
      return
    }
    setStatus('saving')
    const endpoint = editingId ? '/api/clients/update' : '/api/clients/create'
    const payload = editingId ? { id: editingId, ...form } : form
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setStatus('idle')
      setError(body?.message ?? 'Unable to save client.')
      return
    }
    const body = await response.json().catch(() => null)
    if (editingId && body?.client) {
      setClients((prev) => prev.map((client) => client.id === editingId ? body.client : client))
    } else if (body?.client) {
      setClients((prev) => [body.client, ...prev])
    } else {
      await loadClients()
    }
    setStatus('idle')
    resetForm()
  }

  const deleteClient = async (clientId: string) => {
    setError(null)
    setStatus('saving')
    const response = await fetch('/api/clients/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setStatus('idle')
      setError(body?.message ?? 'Unable to delete client.')
      return
    }
    setClients((prev) => prev.filter((client) => client.id !== clientId))
    setStatus('idle')
  }

  return (
    <>
      <Head>
        <title>Clients</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>Clients</h1>
              <p>Manage your recurring clients and contact details.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
          </div>
        </header>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>{editingId ? 'Edit client' : 'Add client'}</h2>
              {editingId && (
                <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
              )}
            </div>
            <form className="auth-form" onSubmit={submitClient}>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Address</span>
                <input
                  type="text"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </label>
              <button className="btn primary" type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : editingId ? 'Update client' : 'Add client'}
              </button>
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Client list</h2>
              <button className="btn ghost" type="button" onClick={loadClients} disabled={status === 'loading'}>
                {status === 'loading' ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="employee-list">
              {clients.length === 0 && (
                <p className="section-subtitle">No clients yet. Add your first client to get started.</p>
              )}
              {clients.map((client) => (
                <div className="employee-row" key={client.id}>
                  <div>
                    <strong>{client.name}</strong>
                    <span>
                      {client.email || 'No email'} · {client.phone || 'No phone'}
                    </span>
                    <span>
                      {client.address || 'No address'}
                    </span>
                  </div>
                  <div className="dash-actions">
                    <button className="btn" type="button" onClick={() => startEdit(client)}>
                      Edit
                    </button>
                    <button className="btn ghost" type="button" onClick={() => deleteClient(client.id)}>
                      Delete
                    </button>
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
