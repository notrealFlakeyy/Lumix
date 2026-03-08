import { hasStripeBillingConfig, hasStripeWebhookConfig } from '@/lib/env/billing'
import { hasEmailDeliveryConfig } from '@/lib/env/email'
import { getSentryEnvironment, getSentryRelease, hasSentryConfig, hasSentrySourceMapConfig } from '@/lib/env/monitoring'
import { getServiceRoleEnv } from '@/lib/env/service-role'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { transportDocumentsBucket } from '@/lib/documents/storage'

export async function GET() {
  const startedAt = Date.now()

  try {
    const env = getServiceRoleEnv()
    const admin = createSupabaseAdminClient()
    const { error, count } = await admin.from('companies').select('id', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    return Response.json(
      {
        status: 'ok',
        checked_at: new Date().toISOString(),
        latency_ms: Date.now() - startedAt,
        checks: {
          database: 'ok',
          site_url_configured: Boolean(env.NEXT_PUBLIC_SITE_URL),
          email_delivery_configured: hasEmailDeliveryConfig(),
          stripe_billing_configured: hasStripeBillingConfig(),
          stripe_webhook_configured: hasStripeWebhookConfig(),
          sentry_configured: hasSentryConfig(),
          sentry_environment: getSentryEnvironment(),
          sentry_release: getSentryRelease() ?? null,
          sentry_source_maps_configured: hasSentrySourceMapConfig(),
          expected_documents_bucket: transportDocumentsBucket,
        },
        stats: {
          companies: count ?? 0,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        checked_at: new Date().toISOString(),
        latency_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Health check failed.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}
