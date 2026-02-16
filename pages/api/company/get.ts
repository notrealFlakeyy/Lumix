import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const supabase = createPagesServerClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ message: 'You must be signed in.' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      contact_email,
      contact_phone,
      contact_address,
      contact_city,
      contact_postal_code,
      contact_country,
      billing_email,
      billing_address,
      vat_id,
      kpi_cash_label,
      kpi_cash_note,
      kpi_outstanding_label,
      kpi_outstanding_note,
      kpi_payroll_label,
      kpi_payroll_note,
      kpi_employees_label,
      kpi_employees_note
    `)
    .eq('id', profile.company_id)
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not load company profile.' })
  }

  return res.status(200).json({ company })
}
