import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type TimeRow = {
  user_id: string
  net_minutes: number
  profiles: { full_name: string }[] | { full_name: string }
}

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

  const start = typeof req.query.start === 'string' ? req.query.start : null
  const end = typeof req.query.end === 'string' ? req.query.end : null

  let query = supabase
    .from('time_entries')
    .select('user_id, net_minutes, profiles!inner(full_name)')
    .eq('company_id', profile.company_id)
    .eq('status', 'closed')

  if (start) query = query.gte('start_time', start)
  if (end) query = query.lte('start_time', end)

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    query = query.eq('user_id', session.user.id)
  }

  const { data: rows, error } = await query

  if (error) {
    return res.status(500).json({ message: 'Could not load time summary.' })
  }

  const totals = new Map<string, { full_name: string; minutes: number }>()
  ;(rows as unknown as TimeRow[]).forEach((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const fullName = profile?.full_name ?? 'Unknown'
    const existing = totals.get(row.user_id) ?? { full_name: fullName, minutes: 0 }
    totals.set(row.user_id, {
      full_name: fullName,
      minutes: existing.minutes + (Number(row.net_minutes) || 0),
    })
  })

  return res.status(200).json({
    summary: Array.from(totals.entries()).map(([user_id, data]) => ({
      user_id,
      full_name: data.full_name,
      minutes: data.minutes,
    })),
  })
}
