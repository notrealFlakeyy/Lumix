import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'

const schema = z.object({
  voidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })

  const { error } = await auth.supabase.rpc('void_ar_invoice', {
    p_invoice_id: id,
    p_void_date: parsed.data.voidDate ?? null,
    p_reason: parsed.data.reason ?? null,
  })

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
