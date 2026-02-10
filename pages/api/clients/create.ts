import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type CreateClientPayload = {
  name: string
  email?: string
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

  const payload = req.body as CreateClientPayload
  if (!payload?.name?.trim()) {
    return res.status(400).json({ message: 'Client name is required.' })
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      company_id: profile.company_id,
      name: payload.name.trim(),
      email: payload.email?.trim() || null,
    })
    .select('id, name, email')
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not create client.' })
  }

  return res.status(200).json({ client })
}
