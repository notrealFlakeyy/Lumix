import { CheckCircle2, Circle, Clock, MapPin, Truck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/utils/dates'

const STATUS_STEPS = [
  { key: 'planned', label: 'Order received' },
  { key: 'assigned', label: 'Driver assigned' },
  { key: 'in_progress', label: 'In transit' },
  { key: 'completed', label: 'Delivered' },
] as const

const STATUS_ORDER = ['planned', 'assigned', 'in_progress', 'completed'] as const

function getStatusIndex(status: string) {
  return STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number])
}

export default async function TrackingPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { orderId } = await params
  const supabase = createSupabaseAdminClient()

  const { data: order } = await supabase
    .from('transport_orders')
    .select('order_number, pickup_location, delivery_location, scheduled_at, status, updated_at, company_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || order.status === 'cancelled') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-md ">
          <CardContent className="px-8 py-10 text-center">
            <p className="text-sm text-muted-foreground">This tracking link is no longer valid or the order has been cancelled.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { data: company } = await supabase.from('companies').select('name').eq('id', order.company_id).maybeSingle()

  const currentIndex = getStatusIndex(order.status)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          {company?.name ? <p className="text-sm font-medium text-muted-foreground">{company.name}</p> : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Order {order.order_number}</h1>
          {order.scheduled_at ? (
            <p className="mt-1 text-sm text-muted-foreground">Scheduled: {formatDateTime(order.scheduled_at)}</p>
          ) : null}
        </div>

        <Card >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-[rgb(var(--app-accent))]" />
              Delivery Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx < currentIndex
                const isCurrent = idx === currentIndex
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : isCurrent ? (
                      <Clock className="h-5 w-5 shrink-0 text-[rgb(var(--app-accent))]" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={isCurrent ? 'font-semibold text-foreground' : isDone ? 'text-muted-foreground line-through' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                    {isCurrent ? (
                      <span className="ml-auto rounded-full bg-[rgba(var(--app-accent),0.12)] px-2 py-0.5 text-xs font-medium text-[rgb(var(--app-accent))]">Current</span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pickup</p>
                <p className="text-sm text-foreground">{order.pickup_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--app-accent))]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery</p>
                <p className="text-sm text-foreground">{order.delivery_location}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Last updated {formatDateTime(order.updated_at)}</p>
      </div>
    </main>
  )
}
