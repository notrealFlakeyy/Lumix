import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type UpdateCompanyPayload = {
  name: string
  contact_email?: string
  contact_phone?: string
  contact_address?: string
  contact_city?: string
  contact_postal_code?: string
  contact_country?: string
  billing_email?: string
  billing_address?: string
  vat_id?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
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
    .select('company_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return res.status(403).json({ message: 'You do not have permission to update company settings.' })
  }

  const payload = req.body as UpdateCompanyPayload
  if (!payload?.name?.trim()) {
    return res.status(400).json({ message: 'Company name is required.' })
  }

  const { data: company, error } = await supabase
    .from('companies')
    .update({
      name: payload.name.trim(),
      contact_email: payload.contact_email?.trim() || null,
      contact_phone: payload.contact_phone?.trim() || null,
      contact_address: payload.contact_address?.trim() || null,
      contact_city: payload.contact_city?.trim() || null,
      contact_postal_code: payload.contact_postal_code?.trim() || null,
      contact_country: payload.contact_country?.trim() || null,
      billing_email: payload.billing_email?.trim() || null,
      billing_address: payload.billing_address?.trim() || null,
      vat_id: payload.vat_id?.trim() || null,
    })
    .eq('id', profile.company_id)
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
      vat_id
    `)
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not update company profile.' })
  }

  return res.status(200).json({ company })
}
