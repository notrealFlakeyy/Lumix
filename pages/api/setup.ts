import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdmin } from '../../lib/supabaseAdmin'

type SetupRequest = {
  userId?: string
  businessName?: string
  size?: string
  region?: string
  features?: string[]
  payrollFrequency?: string
  payrollCurrency?: string
  payrollNextRunDate?: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  const payload = req.body as SetupRequest
  if (
    !payload.userId ||
    !payload.businessName ||
    !payload.size ||
    !payload.region ||
    !Array.isArray(payload.features) ||
    !payload.payrollFrequency ||
    !payload.payrollCurrency
  ) {
    res.status(400).json({ message: 'Missing required fields' })
    return
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: payload.businessName,
      size: payload.size,
      region: payload.region,
      features: payload.features,
      payroll_frequency: payload.payrollFrequency,
      payroll_currency: payload.payrollCurrency,
      payroll_next_run_date: payload.payrollNextRunDate ?? null,
      cash_balance: 84210,
      next_payroll_total: 31900,
      next_payroll_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (companyError || !company) {
    res.status(500).json({ message: 'Could not create company' })
    return
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: payload.userId,
    company_id: company.id,
    role: 'admin',
    full_name: payload.businessName,
  })

  if (profileError) {
    res.status(500).json({ message: 'Could not create profile' })
    return
  }

  await supabaseAdmin.from('invoices').insert([
    { company_id: company.id, client: 'Acme Studio', invoice_number: 'INV-2041', due_date: null, amount: 4200, status: 'pending' },
    { company_id: company.id, client: 'Northwind Labs', invoice_number: 'INV-2039', due_date: null, amount: 7850, status: 'overdue' },
    { company_id: company.id, client: 'Bluefin Media', invoice_number: 'INV-2033', due_date: null, amount: 2960, status: 'paid' },
  ])

  await supabaseAdmin.from('employees').insert([
    { company_id: company.id, full_name: 'Jordan Lee', team: 'Finance', role: 'Admin', status: 'active' },
    { company_id: company.id, full_name: 'Samira Khan', team: 'Operations', role: 'Employee', status: 'active' },
    { company_id: company.id, full_name: 'Ella Cruz', team: 'Payroll', role: 'Employee', status: 'active' },
  ])

  res.status(200).json({ message: 'Setup saved', companyId: company.id })
}
