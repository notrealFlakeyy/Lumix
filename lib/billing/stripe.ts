import 'server-only'

import Stripe from 'stripe'

import { getBillingEnv, hasStripeBillingConfig } from '@/lib/env/billing'
import { getServiceRoleEnv } from '@/lib/env/service-role'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { BillingPlanKey } from '@/types/app'
import type { TableRow } from '@/types/database'

let stripeClient: Stripe | null = null

function isBillingPlanKey(value: string | null | undefined): value is BillingPlanKey {
  return value === 'starter' || value === 'growth' || value === 'enterprise'
}

export function createStripeClient() {
  if (!hasStripeBillingConfig()) {
    throw new Error('Stripe billing is not configured.')
  }

  if (stripeClient) return stripeClient

  stripeClient = new Stripe(getBillingEnv().STRIPE_SECRET_KEY as string, {
    apiVersion: '2026-02-25.clover',
  })

  return stripeClient
}

export function getStripePriceId(planKey: Exclude<BillingPlanKey, 'enterprise'>) {
  const env = getBillingEnv()

  if (planKey === 'starter') {
    return env.STRIPE_PRICE_STARTER ?? null
  }

  if (planKey === 'growth') {
    return env.STRIPE_PRICE_GROWTH ?? null
  }

  return null
}

export function getPlanKeyFromPriceId(priceId: string | null | undefined): BillingPlanKey | null {
  if (!priceId) return null

  if (priceId === getBillingEnv().STRIPE_PRICE_STARTER) {
    return 'starter'
  }

  if (priceId === getBillingEnv().STRIPE_PRICE_GROWTH) {
    return 'growth'
  }

  return null
}

function getAppBaseUrl() {
  return (getServiceRoleEnv().NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

async function findCompanyBillingAccount(companyId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('company_billing_accounts')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as TableRow<'company_billing_accounts'> | null) ?? null
}

export async function ensureStripeCustomer({
  company,
  fallbackEmail,
}: {
  company: TableRow<'companies'>
  fallbackEmail?: string | null
}) {
  const stripe = createStripeClient()
  const admin = createSupabaseAdminClient()
  const existing = await findCompanyBillingAccount(company.id)

  if (existing?.stripe_customer_id) {
    return existing
  }

  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email ?? fallbackEmail ?? undefined,
    metadata: {
      company_id: company.id,
      company_name: company.name,
    },
  })

  const { data, error } = await admin
    .from('company_billing_accounts')
    .upsert(
      {
        company_id: company.id,
        stripe_customer_id: customer.id,
        billing_email: customer.email ?? company.email ?? fallbackEmail ?? null,
        billing_name: customer.name ?? company.name,
        stripe_default_payment_method_id:
          typeof customer.invoice_settings.default_payment_method === 'string'
            ? customer.invoice_settings.default_payment_method
            : null,
      },
      { onConflict: 'company_id' },
    )
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to persist Stripe customer.')
  }

  return data as TableRow<'company_billing_accounts'>
}

export async function createBillingCheckoutSession({
  company,
  userEmail,
  locale,
  planKey,
  returnPath,
}: {
  company: TableRow<'companies'>
  userEmail?: string | null
  locale: string
  planKey: Exclude<BillingPlanKey, 'enterprise'>
  returnPath?: string
}) {
  const stripe = createStripeClient()
  const billingAccount = await ensureStripeCustomer({ company, fallbackEmail: userEmail })
  const priceId = getStripePriceId(planKey)

  if (!priceId) {
    throw new Error(`Stripe price is not configured for the ${planKey} plan.`)
  }

  const baseUrl = getAppBaseUrl()
  const returnUrl = returnPath ? `${baseUrl}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}` : `${baseUrl}/${locale}/settings`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: billingAccount.stripe_customer_id,
    payment_method_types: ['card', 'link'],
    success_url: `${returnUrl}?success=${encodeURIComponent(`${planKey[0].toUpperCase()}${planKey.slice(1)} checkout started.`)}`,
    cancel_url: `${returnUrl}?error=${encodeURIComponent('Stripe checkout was cancelled.')}`,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    metadata: {
      company_id: company.id,
      plan_key: planKey,
    },
    subscription_data: {
      metadata: {
        company_id: company.id,
        plan_key: planKey,
      },
    },
  })

  if (!session.url) {
    throw new Error('Stripe did not return a checkout session URL.')
  }

  return session.url
}

export async function createBillingPortalSession({
  company,
  locale,
  returnPath,
}: {
  company: TableRow<'companies'>
  locale: string
  returnPath?: string
}) {
  const stripe = createStripeClient()
  const billingAccount = await findCompanyBillingAccount(company.id)

  if (!billingAccount?.stripe_customer_id) {
    throw new Error('No Stripe customer has been linked to this company yet.')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billingAccount.stripe_customer_id,
    return_url: returnPath
      ? `${getAppBaseUrl()}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`
      : `${getAppBaseUrl()}/${locale}/settings`,
  })

  return session.url
}

export async function resolveCompanyIdForStripeCustomer(stripeCustomerId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('company_billing_accounts')
    .select('company_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.company_id ?? null
}

export async function upsertBillingAccountFromStripeCustomer({
  companyId,
  customer,
}: {
  companyId: string
  customer: Stripe.Customer
}) {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('company_billing_accounts').upsert(
    {
      company_id: companyId,
      stripe_customer_id: customer.id,
      billing_email: customer.email ?? null,
      billing_name: customer.name ?? null,
      stripe_default_payment_method_id:
        typeof customer.invoice_settings.default_payment_method === 'string'
          ? customer.invoice_settings.default_payment_method
          : null,
    },
    { onConflict: 'company_id' },
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncStripeSubscription({
  companyId,
  subscription,
}: {
  companyId: string
  subscription: Stripe.Subscription
}) {
  const admin = createSupabaseAdminClient()
  const primaryItem = subscription.items.data[0]
  const metadataPlanKey = subscription.metadata.plan_key
  const inferredPlanKey = getPlanKeyFromPriceId(primaryItem?.price.id)
  const planKey = (isBillingPlanKey(metadataPlanKey) ? metadataPlanKey : inferredPlanKey) ?? 'growth'

  const { error } = await admin.from('company_subscriptions').upsert(
    {
      company_id: companyId,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      plan_key: planKey,
      status: subscription.status,
      stripe_price_id: primaryItem?.price.id ?? null,
      seats: primaryItem?.quantity ?? 1,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: primaryItem?.current_period_start ? new Date(primaryItem.current_period_start * 1000).toISOString() : null,
      current_period_end: primaryItem?.current_period_end ? new Date(primaryItem.current_period_end * 1000).toISOString() : null,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    },
    { onConflict: 'company_id' },
  )

  if (error) {
    throw new Error(error.message)
  }
}
