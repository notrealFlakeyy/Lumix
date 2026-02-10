import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type DeleteEmployeePayload = {
  id: string
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
    return res.status(403).json({ message: 'You do not have permission to manage employees.' })
  }

  const payload = req.body as DeleteEmployeePayload
  if (!payload?.id) {
    return res.status(400).json({ message: 'Employee id is required.' })
  }

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', payload.id)
    .eq('company_id', profile.company_id)

  if (error) {
    return res.status(500).json({ message: 'Could not delete employee.' })
  }

  return res.status(200).json({ success: true })
}
