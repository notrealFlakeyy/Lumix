import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

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
    const { data: company, error } = await supabase
      .from('companies')
      .select('payroll_frequency, payroll_currency, payroll_next_run_date')
      .eq('id', profile.company_id)
      .single()

    if (error) {
      return res.status(500).json({ message: 'Could not load payroll settings.' })
    }

    return res.status(200).json({ settings: company })
  }

  if (req.method === 'POST') {
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      return res.status(403).json({ message: 'You do not have permission to update payroll settings.' })
    }

    const payload = req.body as {
      payroll_frequency?: string
      payroll_currency?: string
      payroll_next_run_date?: string | null
    }

    if (!payload?.payroll_frequency || !payload?.payroll_currency) {
      return res.status(400).json({ message: 'Missing payroll settings.' })
    }

    const { data: company, error } = await supabase
      .from('companies')
      .update({
        payroll_frequency: payload.payroll_frequency,
        payroll_currency: payload.payroll_currency,
        payroll_next_run_date: payload.payroll_next_run_date ?? null,
      })
      .eq('id', profile.company_id)
      .select('payroll_frequency, payroll_currency, payroll_next_run_date')
      .single()

    if (error) {
      return res.status(500).json({ message: 'Could not update payroll settings.' })
    }

    return res.status(200).json({ settings: company })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: 'Method not allowed' })
}
