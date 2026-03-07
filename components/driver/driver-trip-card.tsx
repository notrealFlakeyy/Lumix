import { ArrowRight, Clock3, FileText, Truck } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { TripStatusBadge } from '@/components/trips/trip-status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { getTripRouteId } from '@/lib/utils/public-ids'

type DriverTripCardProps = {
  locale: string
  trip: {
    id: string
    public_id?: string | null
    customer_name: string
    pickup_location: string | null
    delivery_location: string | null
    vehicle_name: string
    order_number: string | null
    invoice_number: string | null
    scheduled_at: string | null
    start_km: string | null
    end_km: string | null
    waiting_time_minutes: number
    status: string
  }
  previewDriverId?: string | null
}

export function DriverTripCard({ locale, trip, previewDriverId }: DriverTripCardProps) {
  const routeId = getTripRouteId(trip)
  const href = previewDriverId ? `/driver/trips/${routeId}?driver=${previewDriverId}` : `/driver/trips/${routeId}`

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{trip.customer_name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>{trip.pickup_location ?? 'Pickup TBD'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
              <span>{trip.delivery_location ?? 'Delivery TBD'}</span>
            </div>
          </div>
          <TripStatusBadge status={trip.status as any} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            <span>{formatDateTime(trip.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400" />
            <span>{trip.vehicle_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span>{trip.order_number ?? 'Direct trip'}{trip.invoice_number ? ` • ${trip.invoice_number}` : ''}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {trip.start_km ? <Badge variant="default">Start {toDisplayNumber(trip.start_km)} km</Badge> : null}
          {trip.end_km ? <Badge variant="success">End {toDisplayNumber(trip.end_km)} km</Badge> : null}
          {trip.waiting_time_minutes > 0 ? <Badge variant="warning">Wait {trip.waiting_time_minutes} min</Badge> : null}
        </div>

        <Link href={href} className="block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white">
          Open trip workflow
        </Link>
      </CardContent>
    </Card>
  )
}
