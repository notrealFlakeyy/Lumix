import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type UpdateEmployeePayload = {
  id: string
  full_name: string
  team?: string
  role?: string
  status?: string
  hourly_rate?: number
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

  const payload = req.body as UpdateEmployeePayload
  if (!payload?.id || !payload?.full_name?.trim()) {
    return res.status(400).json({ message: 'Employee name is required.' })
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .update({
      full_name: payload.full_name.trim(),
      team: payload.team?.trim() || null,
      role: payload.role?.trim() || null,
      hourly_rate: Number(payload.hourly_rate) || 0,
      status: payload.status?.trim() || 'active',
    })
    .eq('id', payload.id)
    .eq('company_id', profile.company_id)
    .select('id, full_name, team, role, status, hourly_rate')
    .single()

  if (error) {
    return res.status(500).json({ message: 'Could not update employee.' })
  }

  return res.status(200).json({ employee })
}
