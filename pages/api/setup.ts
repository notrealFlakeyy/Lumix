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
