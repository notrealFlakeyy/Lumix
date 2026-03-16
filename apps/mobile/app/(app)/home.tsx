import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { AppText, Button, EmptyState, LoadingState, Screen, Section, StatCard, uiStyles } from '@/src/components/ui'
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
      <Screen>
        <LoadingState label="Loading mobile dashboard" />
      </Screen>
    )
  }

  return (
    <Screen>
      <Section
        title={me?.active_driver.full_name ?? 'Driver'}
        subtitle={`${me?.membership.company.name ?? 'No company'} - ${me?.membership.role ?? 'user'}`}
      >
        <AppText muted>Enabled modules: {(me?.membership.enabled_modules ?? []).join(', ') || 'transport'}</AppText>
        <View style={uiStyles.wrap}>
          <StatCard label="Live trips" value={String(Number(data?.stats.live_trips ?? 0))} />
          <StatCard label="Planned" value={String(Number(data?.stats.planned_trips ?? 0))} />
          <StatCard label="Today" value={formatMinutes(data?.stats.todays_minutes ?? 0)} />
        </View>
      </Section>

      <Section title="Quick access" subtitle="The native app talks to the versioned `/api/mobile/v1` backend.">
        <Link href="/(app)/trips" asChild>
          <Button title="Open trips" />
        </Link>
        <Link href="/(app)/documents" asChild>
          <Button title="Open documents" variant="secondary" />
        </Link>
        {me?.membership.enabled_modules.includes('time') ? (
          <Link href="/(app)/time" asChild>
            <Button title="Open time" variant="ghost" />
          </Link>
        ) : null}
      </Section>

      <Section title="Next actions" subtitle="Mirrors the task-driven mobile workflow from the web app.">
        {error ? <AppText>{error}</AppText> : null}
        {data?.priority_items.length ? (
          data.priority_items.map((item) => (
            <View key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12, gap: 4 }}>
              <AppText strong>{item.title}</AppText>
              <AppText muted>{item.detail}</AppText>
              {item.trip_id ? (
                <Link href={`/(app)/trips/${item.trip_id}`} asChild>
                  <Button title="Open trip" variant="ghost" />
                </Link>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState title="No urgent actions" detail="The driver queue is clear right now." />
        )}
      </Section>

      <Section title="Today timeline" subtitle="Shift and trip events from the mobile API.">
        {data?.timeline_items.length ? (
          data.timeline_items.map((item) => (
            <View key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12, gap: 4 }}>
              <AppText strong>{item.title}</AppText>
              <AppText muted>{item.detail}</AppText>
              <AppText muted>{formatDateTime(item.time)}</AppText>
            </View>
          ))
        ) : (
          <EmptyState title="No timeline items yet" detail="Shift and trip events will appear here during the day." />
        )}
      </Section>
    </Screen>
  )
}
