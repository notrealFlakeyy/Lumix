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

  const { data: entry } = await supabase
    .from('time_entries')
    .select('id, start_time, status')
    .eq('user_id', session.user.id)
    .eq('status', 'open')
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  let openBreak: { id: string; start_time: string } | null = null
  if (entry?.id) {
    const { data: brk } = await supabase
      .from('time_breaks')
      .select('id, start_time, status')
      .eq('time_entry_id', entry.id)
      .eq('status', 'open')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (brk?.id) {
      openBreak = { id: brk.id, start_time: brk.start_time }
    }
  }

  return res.status(200).json({
    openEntry: entry ?? null,
    openBreak,
  })
}
