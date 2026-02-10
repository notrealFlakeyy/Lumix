import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type CreateRunPayload = {
  runDate: string
  frequency: string
  currency: string
  items: Array<{
    employeeId: string
    gross: number
    tax: number
    deductions: number
  }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ message: 'You must be signed in.' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  if (req.method === 'GET') {
    const { data: runs, error } = await supabase
      .from('payroll_runs')
      .select('id, run_date, frequency, currency, status, total_gross, total_tax, total_deductions, total_net, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return res.status(500).json({ message: 'Could not load payroll runs.' })
    }

    return res.status(200).json({ runs: runs ?? [] })
  }

  if (req.method === 'POST') {
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      return res.status(403).json({ message: 'You do not have permission to create payroll runs.' })
    }

    const payload = req.body as CreateRunPayload
    if (!payload?.runDate || !payload?.frequency || !payload?.currency) {
      return res.status(400).json({ message: 'Missing payroll run details.' })
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ message: 'Payroll run must include at least one employee.' })
    }

    const normalized = payload.items.map((item) => ({
      employeeId: item.employeeId,
      gross: Number(item.gross),
      tax: Number(item.tax),
      deductions: Number(item.deductions),
    }))

    if (normalized.some((item) => !item.employeeId || !Number.isFinite(item.gross))) {
      return res.status(400).json({ message: 'Invalid payroll item data.' })
    }

    const items = normalized.map((item) => {
      const net = item.gross - item.tax - item.deductions
      return { ...item, net }
    })

    const totalGross = items.reduce((sum, item) => sum + item.gross, 0)
    const totalTax = items.reduce((sum, item) => sum + item.tax, 0)
    const totalDeductions = items.reduce((sum, item) => sum + item.deductions, 0)
    const totalNet = items.reduce((sum, item) => sum + item.net, 0)

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        company_id: profile.company_id,
        run_date: payload.runDate,
        frequency: payload.frequency,
        currency: payload.currency,
        status: 'draft',
        total_gross: totalGross,
        total_tax: totalTax,
        total_deductions: totalDeductions,
        total_net: totalNet,
      })
      .select('id')
      .single()

    if (runError || !run) {
      return res.status(500).json({ message: 'Could not create payroll run.' })
    }

    const { error: itemsError } = await supabase
      .from('payroll_items')
      .insert(
        items.map((item) => ({
          payroll_run_id: run.id,
          employee_id: item.employeeId,
          gross: item.gross,
          tax: item.tax,
          deductions: item.deductions,
          net: item.net,
        })),
      )

    if (itemsError) {
      return res.status(500).json({ message: 'Could not save payroll items.' })
    }

    return res.status(200).json({ runId: run.id })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: 'Method not allowed' })
}
