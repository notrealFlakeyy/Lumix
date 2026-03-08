import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? 0.1 : 1)),
  integrations: [Sentry.browserTracingIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
