import 'server-only'

import { z } from 'zod'

const optionalString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}, z.string().min(1).optional())

const billingEnvSchema = z.object({
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_STARTER: optionalString,
  STRIPE_PRICE_GROWTH: optionalString,
})

type BillingEnv = z.infer<typeof billingEnvSchema>

let cached: BillingEnv | null = null

export function getBillingEnv() {
  if (cached) return cached

  cached = billingEnvSchema.parse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER,
    STRIPE_PRICE_GROWTH: process.env.STRIPE_PRICE_GROWTH,
  })

  return cached
}

export function hasStripeBillingConfig() {
  return Boolean(getBillingEnv().STRIPE_SECRET_KEY)
}

export function hasStripeWebhookConfig() {
  const env = getBillingEnv()
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}
