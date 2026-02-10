import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type UpdateClientPayload = {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
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
    return res.status(403).json({ message: 'You do not have permission to manage clients.' })
  }

  const payload = req.body as UpdateClientPayload
  if (!payload?.id || !payload?.name?.trim()) {
    return res.status(400).json({ message: 'Client name is required.' })
  }

  const { data: client, error } = await supabase
    .from('clients')
    .update({
      name: payload.name.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
    })
    .eq('id', payload.id)
    .eq('company_id', profile.company_id)
    .select('id, name, email, phone, address')
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not update client.' })
  }

  return res.status(200).json({ client })
}
