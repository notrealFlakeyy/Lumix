import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text } from 'react-native'

import { AppText, Button, EmptyState, LoadingState, Screen, Section } from '@/src/components/ui'
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
      <Screen>
        <LoadingState label="Loading trips" />
      </Screen>
    )
  }

  return (
    <Screen>
      <Section title="Trips" subtitle={data ? `${data.trips.length} trip(s) assigned` : 'Assigned work for the signed-in driver'}>
        {error ? <AppText>{error}</AppText> : null}
        {data?.trips.length ? (
          data.trips.map((trip) => (
            <Link key={trip.route_id ?? trip.id} href={`/(app)/trips/${trip.route_id ?? trip.id}`} asChild>
              <Button
                title={`${trip.customer_name ?? 'Customer'} - ${formatTripStatus(trip.status)}`}
                variant={trip.status === 'started' ? 'primary' : 'secondary'}
              />
            </Link>
          ))
        ) : (
          <EmptyState title="No assigned trips" detail="Trips assigned to the current driver will appear here." />
        )}
      </Section>

      <Section title="Trip summary" subtitle="Each row is backed by `/api/mobile/v1/trips`.">
        {data?.trips.map((trip) => (
          <Text key={`summary-${trip.id}`} style={{ color: '#334155' }}>
            {trip.order_number ?? 'No order'} - {trip.pickup_location ?? 'Pickup TBD'} {'->'} {trip.delivery_location ?? 'Delivery TBD'} -{' '}
            {formatDateTime(trip.scheduled_at ?? trip.start_time ?? trip.created_at)}
          </Text>
        ))}
      </Section>
    </Screen>
  )
}
