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
    .select('company_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  let query = supabase
    .from('time_entries')
    .select('id, user_id, start_time, end_time, duration_minutes, break_minutes, net_minutes, status')
    .eq('company_id', profile.company_id)
    .order('start_time', { ascending: false })
    .limit(20)

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    query = query.eq('user_id', session.user.id)
  }

  const { data: entries, error } = await query

  if (error) {
    return res.status(500).json({ message: 'Could not load time entries.' })
  }

  return res.status(200).json({ entries: entries ?? [] })
}
