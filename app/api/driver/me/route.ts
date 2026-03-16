import { NextResponse } from 'next/server'

import { requireDriverApi } from '@/lib/auth/require-driver-api'
import { getDriverRouteId } from '@/lib/utils/public-ids'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireDriverApi({ previewDriverId })

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }

  return NextResponse.json({
    ok: true,
    membership: {
      company_id: context.membership.company_id,
      role: context.membership.role,
      enabled_modules: context.membership.enabledModules,
      branch_ids: context.membership.branchIds,
      has_restricted_branch_access: context.membership.hasRestrictedBranchAccess,
      company: context.membership.company,
    },
    active_driver: {
      ...context.activeDriver,
      route_id: getDriverRouteId(context.activeDriver),
    },
    matched_driver_id: context.matchedDriver ? getDriverRouteId(context.matchedDriver) : null,
    preview_driver_id: context.previewDriverId,
    is_preview_mode: context.isPreviewMode,
    workforce_employee: context.workforceEmployee,
    available_preview_drivers:
      context.membership.role === 'driver'
        ? []
        : context.activeDrivers.map((driver) => ({
            ...driver,
            route_id: getDriverRouteId(driver),
          })),
  })
}
