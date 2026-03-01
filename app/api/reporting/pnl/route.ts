import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'

const schema = z.object({
  start: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  end: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
})

export async function GET(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = schema.safeParse({ start: url.searchParams.get('start'), end: url.searchParams.get('end') })
  if (!parsed.success) return NextResponse.json({ message: 'Invalid query' }, { status: 400 })

  const { data, error } = await auth.supabase.rpc('reporting_pnl', {
    p_org_id: auth.orgId,
    p_start: parsed.data.start,
    p_end: parsed.data.end,
  })

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json(data)
}

