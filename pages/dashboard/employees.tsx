import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getSupabaseServer } from '../../lib/supabaseServer'

type Employee = {
  id: string
  full_name: string
  team: string | null
  role: string | null
  hourly_rate: number | null
  status: string | null
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
  full_name: '',
  team: '',
  role: '',
  hourly_rate: '0',
  status: 'active',
})

export default function EmployeesPage(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const loadEmployees = async () => {
    setStatus('loading')
    const response = await fetch('/api/employees/list')
    if (!response.ok) {
      setStatus('idle')
      setError('Unable to load employees.')
      return
    }
    const payload = await response.json().catch(() => null)
    setEmployees(payload?.employees ?? [])
    setStatus('idle')
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id)
    setForm({
      full_name: employee.full_name ?? '',
      team: employee.team ?? '',
      role: employee.role ?? '',
      hourly_rate: String(employee.hourly_rate ?? 0),
      status: employee.status ?? 'active',
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const submitEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!form.full_name.trim()) {
      setError('Employee name is required.')
      return
    }
    setStatus('saving')
    const endpoint = editingId ? '/api/employees/update' : '/api/employees/create'
    const payload = editingId ? { id: editingId, ...form } : form
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setStatus('idle')
      setError(body?.message ?? 'Unable to save employee.')
      return
    }
    const body = await response.json().catch(() => null)
    if (editingId && body?.employee) {
      setEmployees((prev) => prev.map((employee) => employee.id === editingId ? body.employee : employee))
    } else if (body?.employee) {
      setEmployees((prev) => [body.employee, ...prev])
    } else {
      await loadEmployees()
    }
    setStatus('idle')
    resetForm()
  }

  const deleteEmployee = async (employeeId: string) => {
    setError(null)
    setStatus('saving')
    const response = await fetch('/api/employees/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: employeeId }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setStatus('idle')
      setError(body?.message ?? 'Unable to delete employee.')
      return
    }
    setEmployees((prev) => prev.filter((employee) => employee.id !== employeeId))
    setStatus('idle')
  }

  return (
    <>
      <Head>
        <title>Employees</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="dashboard">
        <header className="dash-header">
          <div className="container dash-header-inner">
            <div>
              <h1>Employees</h1>
              <p>Manage team members, roles, and status.</p>
            </div>
            <div className="dash-actions">
              <a className="btn ghost" href="/dashboard">Back to dashboard</a>
            </div>
          </div>
        </header>

        <section className="container dash-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>{editingId ? 'Edit employee' : 'Add employee'}</h2>
              {editingId && (
                <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
              )}
            </div>
            <form className="auth-form" onSubmit={submitEmployee}>
              <label className="field">
                <span>Full name</span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Team</span>
                <input
                  type="text"
                  value={form.team}
                  onChange={(event) => setForm({ ...form, team: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="Employee">Employee</option>
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="leave">On leave</option>
                </select>
              </label>
              <label className="field">
                <span>Hourly rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourly_rate}
                  onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })}
                />
              </label>
              <button className="btn primary" type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : editingId ? 'Update employee' : 'Add employee'}
              </button>
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Employee list</h2>
              <button className="btn ghost" type="button" onClick={loadEmployees} disabled={status === 'loading'}>
                {status === 'loading' ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="employee-list">
              {employees.length === 0 && (
                <p className="section-subtitle">No employees yet. Add your first team member.</p>
              )}
              {employees.map((employee) => (
                <div className="employee-row" key={employee.id}>
                  <div>
                    <strong>{employee.full_name}</strong>
                    <span>
                      {employee.team || 'No team'} · {employee.role || 'No role'}
                    </span>
                    <span>
                      Status: {employee.status || 'active'} · Rate: €{Number(employee.hourly_rate ?? 0).toFixed(2)}/hr
                    </span>
                  </div>
                  <div className="dash-actions">
                    <button className="btn" type="button" onClick={() => startEdit(employee)}>
                      Edit
                    </button>
                    <button className="btn ghost" type="button" onClick={() => deleteEmployee(employee.id)}>
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
