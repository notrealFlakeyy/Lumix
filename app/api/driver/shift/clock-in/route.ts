import { NextResponse } from 'next/server'

import { requireApiCompany } from '@/lib/auth/require-api-company'
import { getCurrentWorkforceEmployee } from '@/lib/auth/get-current-workforce-employee'
import { startSelfTimeEntry } from '@/lib/db/mutations/workforce'

export async function POST() {
  const context = await requireApiCompany()
  if (!context) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (context.membership.role !== 'driver' || !context.membership.enabledModules.includes('time')) {
    return NextResponse.json({ error: 'Time tracking is not available for this user.' }, { status: 403 })
  }

  const employeeContext = await getCurrentWorkforceEmployee(context.membership.company_id)
  if (!employeeContext.employee) {
    return NextResponse.json({ error: 'No linked workforce employee found for this login.' }, { status: 400 })
  }

  try {
    const entry = await startSelfTimeEntry(
      context.membership.company_id,
      context.user.id,
      employeeContext.employee.id,
      'driver',
      context.supabase,
    )
    return NextResponse.json({ ok: true, entry })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to clock in.' }, { status: 400 })
  }
}
