import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

import { canManageSettings } from '@/lib/auth/permissions'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { hasSentryConfig } from '@/lib/env/monitoring'

export async function POST() {
  const { membership, user } = await getCurrentMembership()

  if (!user || !membership?.company_id) {
    return NextResponse.json({ status: 'error', message: 'Authentication required.' }, { status: 401 })
  }

  if (!canManageSettings(membership.role)) {
    return NextResponse.json({ status: 'error', message: 'Insufficient permissions.' }, { status: 403 })
  }

  if (!hasSentryConfig()) {
    return NextResponse.json({ status: 'error', message: 'NEXT_PUBLIC_SENTRY_DSN is not configured.' }, { status: 400 })
  }

  Sentry.withScope((scope) => {
    scope.setTag('manual_test', 'server')
    scope.setTag('company_id', membership.company_id)
    scope.setUser({ id: user.id, email: user.email ?? undefined })
    Sentry.captureMessage('Manual server-side monitoring test from Settings', 'info')
  })

  await Sentry.flush(2000)

  return NextResponse.json({ status: 'success', message: 'Server monitoring test event sent.' })
}
