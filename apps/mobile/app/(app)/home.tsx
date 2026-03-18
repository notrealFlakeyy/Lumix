import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { AppText, Badge, Button, EmptyState, HeroCard, ListCard, LoadingState, Screen, Section, StatCard, uiStyles } from '@/src/components/ui'
import { formatDateTime, formatMinutes } from '@/src/lib/format'
import { mobileApi } from '@/src/lib/mobile-api'
import { useAuth } from '@/src/providers/auth-provider'
import type { MobileHomeResponse } from '@/src/types/mobile'

export default function HomeScreen() {
  const { session, companyId, me } = useAuth()
  const [data, setData] = useState<Extract<MobileHomeResponse, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    mobileApi
      .home(session, companyId)
      .then((response) => {
        if ('ok' in response && response.ok) {
          setData(response)
          setError(null)
        }
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Failed to load home data.'))
      .finally(() => setLoading(false))
  }, [companyId, session])

  if (loading) {
    return (
      <Screen showDock>
        <LoadingState label="Loading mobile dashboard" />
      </Screen>
    )
  }

  return (
    <Screen showDock>
      <HeroCard
        eyebrow={me?.membership.company.name ?? 'Lumix'}
        title={me?.active_driver.full_name ?? 'Driver'}
        subtitle={`Welcome back. ${Number(data?.stats.live_trips ?? 0)} live trip(s), ${Number(data?.stats.planned_trips ?? 0)} planned, and ${formatMinutes(data?.stats.todays_minutes ?? 0)} logged today.`}
      >
        <View style={uiStyles.row}>
          <Badge label={me?.membership.role ?? 'driver'} tone="accent" />
          <Badge label={`${(me?.membership.enabled_modules ?? []).length || 1} modules`} tone="success" />
        </View>
        <View style={uiStyles.wrap}>
          <StatCard label="Live trips" value={String(Number(data?.stats.live_trips ?? 0))} tone="dark" />
          <StatCard label="Planned" value={String(Number(data?.stats.planned_trips ?? 0))} />
          <StatCard label="Today" value={formatMinutes(data?.stats.todays_minutes ?? 0)} tone="mint" />
        </View>
      </HeroCard>

      <Section title="Quick actions" subtitle="Built for fast one-thumb navigation during the workday.">
        <View style={uiStyles.wrap}>
          <View style={{ flexBasis: '48%', flexGrow: 1 }}>
            <Link href="/(app)/trips" asChild>
              <Button title="Open trips" />
            </Link>
          </View>
          <View style={{ flexBasis: '48%', flexGrow: 1 }}>
            <Link href="/(app)/documents" asChild>
              <Button title="View documents" variant="secondary" />
            </Link>
          </View>
          {me?.membership.enabled_modules.includes('time') ? (
            <View style={{ flexBasis: '48%', flexGrow: 1 }}>
              <Link href="/(app)/time" asChild>
                <Button title="Clock actions" variant="ghost" />
              </Link>
            </View>
          ) : null}
        </View>
      </Section>

      <Section title="Priority queue" subtitle="The most important actions are surfaced first.">
        {error ? <AppText danger>{error}</AppText> : null}
        {data?.priority_items.length ? (
          data.priority_items.map((item) => (
            <View key={item.id} style={uiStyles.stack}>
              <ListCard
                title={item.title}
                subtitle={item.detail}
                tone="accent"
                right={
                  item.trip_id ? (
                    <Link href={`/(app)/trips/${item.trip_id}`} asChild>
                      <Button title="Open" variant="ghost" />
                    </Link>
                  ) : undefined
                }
              />
              {item.trip_id ? (
                <AppText muted>Trip-linked action ready for immediate driver follow-through.</AppText>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState title="No urgent actions" detail="The driver queue is clear right now." />
        )}
      </Section>

      <Section title="Today timeline" subtitle="A calmer event feed for the current shift.">
        {data?.timeline_items.length ? (
          data.timeline_items.map((item) => (
            <ListCard
              key={item.id}
              title={item.title}
              subtitle={`${item.detail} • ${formatDateTime(item.time)}`}
              right={<Badge label={item.kind} tone={item.kind === 'trip' ? 'accent' : 'success'} />}
            />
          ))
        ) : (
          <EmptyState title="No timeline items yet" detail="Shift and trip events will appear here during the day." />
        )}
      </Section>
    </Screen>
  )
}
