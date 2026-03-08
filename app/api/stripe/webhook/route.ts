import Stripe from 'stripe'

import { createStripeClient, resolveCompanyIdForStripeCustomer, syncStripeSubscription, upsertBillingAccountFromStripeCustomer } from '@/lib/billing/stripe'
import { getBillingEnv, hasStripeWebhookConfig } from '@/lib/env/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getMetadataCompanyId(metadata: Record<string, string> | null | undefined) {
  const companyId = metadata?.company_id
  return typeof companyId === 'string' && companyId.length > 0 ? companyId : null
}

async function resolveCompanyIdFromEventObject(object: Stripe.Event.Data.Object) {
  const objectWithMetadata = object as { metadata?: Record<string, string> | null }
  const metadataCompanyId = getMetadataCompanyId(objectWithMetadata.metadata)
  if (metadataCompanyId) {
    return metadataCompanyId
  }

  const objectWithCustomer = object as { customer?: string | { id: string } | null }
  if (typeof objectWithCustomer.customer !== 'undefined') {
    const customerId =
      typeof objectWithCustomer.customer === 'string'
        ? objectWithCustomer.customer
        : objectWithCustomer.customer && typeof objectWithCustomer.customer.id === 'string'
          ? objectWithCustomer.customer.id
          : null

    if (customerId) {
      return resolveCompanyIdForStripeCustomer(customerId)
    }
  }

  return null
}

export async function POST(request: Request) {
  if (!hasStripeWebhookConfig()) {
    return Response.json({ error: 'Stripe webhook is not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  const stripe = createStripeClient()
  const body = await request.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, getBillingEnv().STRIPE_WEBHOOK_SECRET as string)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid Stripe signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer
        const companyId = getMetadataCompanyId(customer.metadata) ?? (await resolveCompanyIdForStripeCustomer(customer.id))

        if (companyId) {
          await upsertBillingAccountFromStripeCustomer({ companyId, customer })
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId =
          getMetadataCompanyId(session.metadata) ??
          (session.customer && typeof session.customer === 'string'
            ? await resolveCompanyIdForStripeCustomer(session.customer)
            : null)

        if (companyId && typeof session.customer === 'string') {
          const customer = (await stripe.customers.retrieve(session.customer)) as Stripe.Customer
          await upsertBillingAccountFromStripeCustomer({ companyId, customer })

          if (typeof session.subscription === 'string') {
            const subscription = await stripe.subscriptions.retrieve(session.subscription)
            await syncStripeSubscription({ companyId, subscription })
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const companyId = await resolveCompanyIdFromEventObject(subscription)

        if (companyId) {
          await syncStripeSubscription({ companyId, subscription })
        }
        break
      }

      default:
        break
    }

    return Response.json({ received: true })
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Stripe webhook handling failed.',
      },
      { status: 500 },
    )
  }
}
