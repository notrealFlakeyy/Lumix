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
  const businessName = payload.businessName?.trim() ?? ''
  const size = payload.size?.trim() ?? ''
  const region = payload.region?.trim() ?? ''
  const payrollFrequency = payload.payrollFrequency?.trim() ?? ''
  const payrollCurrency = payload.payrollCurrency?.trim() ?? ''
  const features = Array.isArray(payload.features)
    ? payload.features.filter((feature): feature is string => typeof feature === 'string' && feature.trim().length > 0)
    : []

  const allowedPayrollFrequencies = ['monthly', 'bi-weekly', 'flexible']
  const allowedPayrollCurrencies = ['EUR', 'USD']

  if (
    !payload.userId ||
    !businessName ||
    !size ||
    !region ||
    features.length === 0 ||
    !payrollFrequency ||
    !payrollCurrency
  ) {
    res.status(400).json({ message: 'Missing required fields' })
    return
  }

  if (!allowedPayrollFrequencies.includes(payrollFrequency)) {
    res.status(400).json({ message: 'Invalid payroll frequency' })
    return
  }

  if (payrollFrequency === 'flexible' && !payload.payrollNextRunDate) {
    res.status(400).json({ message: 'Next pay run date is required for flexible payroll' })
    return
  }

  if (!allowedPayrollCurrencies.includes(payrollCurrency)) {
    res.status(400).json({ message: 'Invalid payroll currency' })
    return
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: businessName,
      size,
      region,
      features,
      payroll_frequency: payrollFrequency,
      payroll_currency: payrollCurrency,
      payroll_next_run_date: payload.payrollNextRunDate ?? null,
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

  res.status(200).json({ message: 'Setup saved', companyId: company.id })
}
