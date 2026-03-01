import { NextResponse } from 'next/server'

import { requireRouteSession } from '@/lib/auth/require-route-session'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'sales', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const { error } = await auth.supabase.rpc('post_ar_invoice', { p_invoice_id: id })
  if (error) {
    return NextResponse.json({ message: 'Failed to post invoice' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
