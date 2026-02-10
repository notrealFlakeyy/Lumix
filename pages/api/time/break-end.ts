import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

const roundToFive = (minutes: number) => Math.round(minutes / 5) * 5

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
    return res.status(400).json({ message: 'You must be clocked in to end a break.' })
  }

  const { data: openBreak } = await supabase
    .from('time_breaks')
    .select('id, start_time')
    .eq('time_entry_id', entry.id)
    .eq('status', 'open')
    .maybeSingle()

  if (!openBreak?.id) {
    return res.status(400).json({ message: 'No active break to end.' })
  }

  const now = new Date()
  const start = new Date(openBreak.start_time)
  const durationRaw = Math.max(0, (now.getTime() - start.getTime()) / 60000)
  const durationMinutes = roundToFive(durationRaw)

  const { error } = await supabase
    .from('time_breaks')
    .update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
      status: 'closed',
    })
    .eq('id', openBreak.id)

  if (error) {
    return res.status(500).json({ message: 'Could not end break.' })
  }

  return res.status(200).json({ duration_minutes: durationMinutes })
}
