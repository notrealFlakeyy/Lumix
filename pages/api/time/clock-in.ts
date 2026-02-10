import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

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
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('status', 'open')
    .maybeSingle()

  if (openEntry?.id) {
    return res.status(400).json({ message: 'You already have an open time entry.' })
  }

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({
      company_id: profile.company_id,
      user_id: session.user.id,
      start_time: new Date().toISOString(),
      status: 'open',
    })
    .select('id, start_time')
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not clock in.' })
  }

  return res.status(200).json({ entry })
}
