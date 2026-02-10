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
    .select('id, start_time')
    .eq('user_id', session.user.id)
    .eq('status', 'open')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!entry?.id) {
    return res.status(400).json({ message: 'No open time entry to close.' })
  }

  const { data: openBreak } = await supabase
    .from('time_breaks')
    .select('id')
    .eq('time_entry_id', entry.id)
    .eq('status', 'open')
    .maybeSingle()

  if (openBreak?.id) {
    return res.status(400).json({ message: 'Please end your break before clocking out.' })
  }

  const now = new Date()
  const start = new Date(entry.start_time)
  const durationMinutesRaw = Math.max(0, (now.getTime() - start.getTime()) / 60000)
  const durationMinutes = roundToFive(durationMinutesRaw)

  const { data: breaks } = await supabase
    .from('time_breaks')
    .select('duration_minutes')
    .eq('time_entry_id', entry.id)
    .eq('status', 'closed')

  const breakMinutesRaw = (breaks ?? []).reduce((sum, brk: { duration_minutes: number }) => sum + (Number(brk.duration_minutes) || 0), 0)
  const breakMinutes = roundToFive(breakMinutesRaw)
  const netMinutes = Math.max(0, durationMinutes - breakMinutes)

  const { error } = await supabase
    .from('time_entries')
    .update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      net_minutes: netMinutes,
      status: 'closed',
    })
    .eq('id', entry.id)

  if (error) {
    return res.status(500).json({ message: 'Could not clock out.' })
  }

  return res.status(200).json({
    duration_minutes: durationMinutes,
    break_minutes: breakMinutes,
    net_minutes: netMinutes,
  })
}
