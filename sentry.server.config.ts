import * as Sentry from '@sentry/nextjs'

import { getSentryEnvironment, getSentryRelease, getSentryTracesSampleRate, hasSentryConfig } from '@/lib/env/monitoring'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: hasSentryConfig(),
  environment: getSentryEnvironment(),
  release: getSentryRelease(),
  tracesSampleRate: getSentryTracesSampleRate(),
})
