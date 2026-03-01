import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSupabaseRouteClient } from '@/lib/supabase/route'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const payloadSchema = z.object({
  orgName: z.string().trim().min(2),
})

const defaultFinnishCoA = [
  { number: '1700', name: 'Myyntisaamiset', type: 'asset' },
  { number: '1910', name: 'Pankkitili', type: 'asset' },
  { number: '1570', name: 'ALV-saamiset', type: 'asset' },
  { number: '2400', name: 'Ostovelat', type: 'liability' },
  { number: '2930', name: 'ALV-velat', type: 'liability' },
  { number: '3000', name: 'Myynti', type: 'income' },
  { number: '4000', name: 'Ostot ja kulut', type: 'expense' },
  { number: '5000', name: 'Palkat', type: 'expense' },
] as const

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: parsed.data.orgName })
    .select('id')
    .single()

  if (orgError || !org) {
    return NextResponse.json({ message: 'Failed to create org' }, { status: 500 })
  }

  const orgId = org.id as string

  const { error: memberError } = await admin.from('org_members').insert({
    org_id: orgId,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    return NextResponse.json({ message: 'Failed to create membership' }, { status: 500 })
  }

  const { error: accountsError } = await admin.from('gl_accounts').insert(
    defaultFinnishCoA.map((a) => ({
      org_id: orgId,
      number: a.number,
      name: a.name,
      type: a.type,
    })),
  )

  if (accountsError) {
    return NextResponse.json({ message: 'Failed to seed accounts' }, { status: 500 })
  }

  await admin.from('accounting_locks').insert({ org_id: orgId }).throwOnError()
  await admin
    .from('ap_approval_rules')
    .insert({ org_id: orgId, min_amount: 1000, required_role: 'admin' })
    .throwOnError()

  return NextResponse.json({ orgId })
}
