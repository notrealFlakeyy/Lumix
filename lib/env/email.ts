import 'server-only'

import { z } from 'zod'

const emailEnvSchema = z.object({
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value
      if (value === 'true') return true
      if (value === 'false') return false
      return false
    }),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
  SMTP_REPLY_TO: z.string().min(1).optional(),
})

type EmailEnv = z.infer<typeof emailEnvSchema>

let cached: EmailEnv | null = null

export function getEmailEnv() {
  if (cached) return cached

  cached = emailEnvSchema.parse({
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_REPLY_TO: process.env.SMTP_REPLY_TO,
  })

  return cached
}

export function hasEmailDeliveryConfig() {
  const env = getEmailEnv()
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM)
}

export function requireEmailDeliveryConfig() {
  const env = getEmailEnv()
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) {
    throw new Error('SMTP_HOST, SMTP_PORT, and SMTP_FROM must be configured before invoice email delivery can be used.')
  }

  return env
}
