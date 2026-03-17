import { apiRateLimiter } from '@/lib/api/rate-limit'
import { requireApiCompany } from '@/lib/auth/require-api-company'
import { globalSearch } from '@/lib/db/queries/search'

export async function GET(request: Request) {
  const context = await requireApiCompany()

  if (!context) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const { membership, user } = context
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const locale = searchParams.get('locale')?.trim() || 'fi'

  if (!query) {
    return Response.json([])
  }

  try {
    await apiRateLimiter.check(30, user.id)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  const results = await globalSearch(membership.company_id, query.slice(0, 100), membership.branchIds, locale)
  return Response.json(results)
}
