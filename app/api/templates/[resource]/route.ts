import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { canManageSettings } from '@/lib/auth/permissions'
import { getCsvTemplateCsv, type CsvTemplateResource } from '@/lib/utils/csv'

function isCsvTemplateResource(value: string): value is CsvTemplateResource {
  return value === 'customers' || value === 'vehicles' || value === 'drivers'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params
  if (!isCsvTemplateResource(resource)) {
    return Response.json({ error: 'Unsupported CSV template.' }, { status: 404 })
  }

  const { membership, user } = await getCurrentMembership()
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!membership?.company_id || !canManageSettings(membership.role)) {
    return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  const csv = getCsvTemplateCsv(resource)
  const fileName = `${resource}-template.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
