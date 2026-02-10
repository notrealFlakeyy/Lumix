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

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, full_name, team, role, status, hourly_rate')
    .eq('company_id', profile.company_id)
    .order('full_name', { ascending: true })

  if (error) {
    return res.status(500).json({ message: 'Could not load employees.' })
  }

  return res.status(200).json({ employees: employees ?? [] })
}
