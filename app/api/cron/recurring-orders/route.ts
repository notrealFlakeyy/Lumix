import 'server-only'

import { cronRateLimiter } from '@/lib/api/rate-limit'
import { generateOrdersFromTemplates } from '@/lib/db/mutations/recurring-orders'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 401 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await cronRateLimiter.check(5, 'cron-recurring-orders')
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: dueTemplates, error } = await supabase
    .from('recurring_order_templates')
    .select('company_id')
    .eq('is_active', true)
    .lte('next_occurrence_date', today)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const companyIds = [...new Set((dueTemplates ?? []).map((row) => row.company_id))]

  if (companyIds.length === 0) {
    return Response.json({ processed_companies: 0, generated_orders: 0, message: 'No recurring orders due.' })
  }

  let generatedOrders = 0
  const errors: string[] = []

  for (const companyId of companyIds) {
    try {
      generatedOrders += await generateOrdersFromTemplates(companyId, supabase)
    } catch (routeError) {
      errors.push(`${companyId}: ${routeError instanceof Error ? routeError.message : String(routeError)}`)
    }
  }

  return Response.json({
    processed_companies: companyIds.length,
    generated_orders: generatedOrders,
    errors: errors.length > 0 ? errors : undefined,
  })
}
