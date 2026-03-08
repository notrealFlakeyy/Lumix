import type { BillingPlanKey } from '@/types/app'

export type BillingPlan = {
  key: BillingPlanKey
  name: string
  monthlyPriceLabel: string
  description: string
  highlights: string[]
  ctaLabel: string
  requiresContact?: boolean
}

export const billingPlans: BillingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    monthlyPriceLabel: 'EUR79/mo',
    description: 'For owner-led carriers replacing spreadsheets and disconnected dispatch notes.',
    highlights: ['Up to 3 office users', 'Driver mobile workflow', 'Invoices, payments, and core reports'],
    ctaLabel: 'Start Starter plan',
  },
  {
    key: 'growth',
    name: 'Growth',
    monthlyPriceLabel: 'EUR179/mo',
    description: 'For growing transport operators who need stronger controls and a clearer operations cockpit.',
    highlights: ['Up to 10 office users', 'Priority onboarding support', 'Multi-role dispatch and accounting workflows'],
    ctaLabel: 'Start Growth plan',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPriceLabel: 'Custom',
    description: 'For larger fleets that need custom rollout, data migration, and commercial terms.',
    highlights: ['Custom onboarding', 'Data migration support', 'Commercial SLA and rollout planning'],
    ctaLabel: 'Contact sales',
    requiresContact: true,
  },
]

export function isBillablePlanKey(value: string): value is Exclude<BillingPlanKey, 'enterprise'> {
  return value === 'starter' || value === 'growth'
}
