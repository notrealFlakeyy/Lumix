import 'server-only'

import { z } from 'zod'

const optionalString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}, z.string().min(1).optional())

const optionalUrl = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}, z.string().url().optional())

const optionalNumber = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}, z.coerce.number().min(0).max(1).optional())

const monitoringEnvSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: optionalNumber,
  SENTRY_ENVIRONMENT: optionalString,
  SENTRY_ORG: optionalString,
  SENTRY_PROJECT: optionalString,
  SENTRY_AUTH_TOKEN: optionalString,
  SENTRY_RELEASE: optionalString,
})

type MonitoringEnv = z.infer<typeof monitoringEnvSchema>

let cached: MonitoringEnv | null = null

export function getMonitoringEnv() {
  if (cached) return cached

  cached = monitoringEnvSchema.parse({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  })

  return cached
}

export function hasSentryConfig() {
  return Boolean(getMonitoringEnv().NEXT_PUBLIC_SENTRY_DSN)
}

export function getSentryEnvironment() {
  const env = getMonitoringEnv()
  return env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development'
}

export function getSentryTracesSampleRate() {
  return getMonitoringEnv().NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? 0.1 : 1)
}

export function getSentryRelease() {
  return getMonitoringEnv().SENTRY_RELEASE
}

export function hasSentrySourceMapConfig() {
  const env = getMonitoringEnv()
  return Boolean(env.SENTRY_ORG && env.SENTRY_PROJECT && env.SENTRY_AUTH_TOKEN)
}
