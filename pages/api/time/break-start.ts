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

  const { data: entry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('status', 'open')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!entry?.id) {
    return res.status(400).json({ message: 'You must be clocked in to start a break.' })
  }

  const { data: openBreak } = await supabase
    .from('time_breaks')
    .select('id')
    .eq('time_entry_id', entry.id)
    .eq('status', 'open')
    .maybeSingle()

  if (openBreak?.id) {
    return res.status(400).json({ message: 'You already have an active break.' })
  }

  const { data: brk, error } = await supabase
    .from('time_breaks')
    .insert({
      time_entry_id: entry.id,
      start_time: new Date().toISOString(),
      status: 'open',
    })
    .select('id, start_time')
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not start break.' })
  }

  return res.status(200).json({ break: brk })
}
