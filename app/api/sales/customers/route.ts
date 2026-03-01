import { NextResponse } from 'next/server'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { createCustomerSchema } from '@/modules/sales/schemas'

export async function POST(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'sales', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = createCustomerSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('ar_customers')
    .insert({ org_id: auth.orgId, name: parsed.data.name, email: parsed.data.email ?? null })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

