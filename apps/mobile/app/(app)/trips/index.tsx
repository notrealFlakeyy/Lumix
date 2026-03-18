import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { AppText, Badge, Button, EmptyState, HeroCard, ListCard, LoadingState, Screen, Section } from '@/src/components/ui'
import { formatDateTime, formatTripStatus } from '@/src/lib/format'
import { mobileApi } from '@/src/lib/mobile-api'
import { useAuth } from '@/src/providers/auth-provider'
import type { MobileTripsResponse } from '@/src/types/mobile'

export default function TripsScreen() {
  const { session, companyId } = useAuth()
  const [data, setData] = useState<Extract<MobileTripsResponse, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    mobileApi
      .trips(session, companyId)
      .then((response) => {
        if ('ok' in response && response.ok) {
          setData(response)
          setError(null)
        }
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Failed to load trips.'))
      .finally(() => setLoading(false))
  }, [companyId, session])

  if (loading) {
    return (
      <Screen showDock>
        <LoadingState label="Loading trips" />
      </Screen>
    )
  }

  const liveTrips = data?.trips.filter((trip) => trip.status === 'started').length ?? 0
  const plannedTrips = data?.trips.filter((trip) => trip.status === 'planned').length ?? 0

  return (
    <Screen showDock>
      <HeroCard
        eyebrow="Trip board"
        title={data ? `${data.trips.length} assigned trip${data.trips.length === 1 ? '' : 's'}` : 'Trips'}
        subtitle={`${liveTrips} active and ${plannedTrips} still planned. Tap any card to open the full transport flow.`}
      >
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Badge label={`${liveTrips} live`} tone="accent" />
          <Badge label={`${plannedTrips} planned`} tone="success" />
        </View>
      </HeroCard>

      <Section title="Assigned routes" subtitle="Each route opens the full trip detail workflow.">
        {error ? <AppText danger>{error}</AppText> : null}
        {data?.trips.length ? (
          data.trips.map((trip) => (
            <ListCard
              key={trip.route_id ?? trip.id}
              title={trip.customer_name ?? 'Customer'}
              subtitle={`${trip.pickup_location ?? 'Pickup TBD'} -> ${trip.delivery_location ?? 'Delivery TBD'}`}
              tone={trip.status === 'started' ? 'accent' : 'default'}
              right={
                <View style={{ gap: 8, alignItems: 'flex-end' }}>
                  <Badge label={formatTripStatus(trip.status)} tone={trip.status === 'started' ? 'accent' : 'ink'} />
                  <Link href={`/(app)/trips/${trip.route_id ?? trip.id}`} asChild>
                    <Button title="Open" variant="ghost" />
                  </Link>
                </View>
              }
            />
          ))
        ) : (
          <EmptyState title="No assigned trips" detail="Trips assigned to the current driver will appear here." />
        )}
      </Section>

      <Section title="Trip summary" subtitle="A lighter overview for route planning at a glance.">
        {data?.trips.map((trip) => (
          <ListCard
            key={`summary-${trip.id}`}
            title={trip.order_number ?? 'No order number'}
            subtitle={`${formatDateTime(trip.scheduled_at ?? trip.start_time ?? trip.created_at)} • ${trip.pickup_location ?? 'Pickup TBD'} -> ${trip.delivery_location ?? 'Delivery TBD'}`}
            right={<Badge label={formatTripStatus(trip.status)} />}
          />
        ))}
      </Section>
    </Screen>
  )
}
