import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'

const schema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive(),
  referenceNumber: z.string().trim().min(1).optional().nullable(),
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
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
  }

  const { error } = await auth.supabase.rpc('record_ar_payment', {
    p_invoice_id: id,
    p_payment_date: parsed.data.paymentDate,
    p_amount: parsed.data.amount,
    p_reference_number: parsed.data.referenceNumber ?? null,
  })

  if (error) {
    return NextResponse.json({ message: 'Failed to record payment' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
