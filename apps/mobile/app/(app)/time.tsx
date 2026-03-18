import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { AppText, Badge, Button, EmptyState, Field, HeroCard, Label, ListCard, LoadingState, Screen, Section, StatCard, uiStyles } from '@/src/components/ui'
import { formatDateTime, formatMinutes } from '@/src/lib/format'
import { mobileApi } from '@/src/lib/mobile-api'
import { useAuth } from '@/src/providers/auth-provider'
import type { MobileTimeSummaryResponse } from '@/src/types/mobile'

export default function TimeScreen() {
  const { session, companyId, me } = useAuth()
  const [data, setData] = useState<Extract<MobileTimeSummaryResponse, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [breakMinutes, setBreakMinutes] = useState('')

  async function load() {
    if (!session) return

    try {
      setLoading(true)
      const response = await mobileApi.timeSummary(session, companyId)
      if ('ok' in response && response.ok) {
        setData(response)
        setError(null)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load time summary.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [companyId, session])

  async function handleClockIn() {
    if (!session) return

    try {
      setSubmitting(true)
      await mobileApi.clockIn(session, companyId)
      await load()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Clock-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClockOut() {
    if (!session) return

    try {
      setSubmitting(true)
      await mobileApi.clockOut(session, { break_minutes: breakMinutes ? Number(breakMinutes) : 0 }, companyId)
      await load()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Clock-out failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!me?.membership.enabled_modules.includes('time')) {
    return (
      <Screen showDock>
        <EmptyState title="Time module disabled" detail="Enable the time module for this tenant to use shift tracking in the native app." />
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen showDock>
        <LoadingState label="Loading time summary" />
      </Screen>
    )
  }

  return (
    <Screen showDock>
      <HeroCard
        eyebrow="Time tracking"
        title={data?.summary.employee?.full_name ?? 'Shift summary'}
        subtitle={`Today ${formatMinutes(data?.summary.todaysMinutes ?? 0)}, submitted ${formatMinutes(data?.summary.submittedMinutes ?? 0)}, approved this week ${formatMinutes(data?.summary.approvedWeekMinutes ?? 0)}.`}
      >
        <View style={uiStyles.row}>
          <Badge label={data?.summary.openEntry ? 'Clocked in' : 'Off shift'} tone={data?.summary.openEntry ? 'accent' : 'success'} />
        </View>
      </HeroCard>

      <Section title="Shift summary" subtitle={data?.summary.employee?.full_name ?? 'No linked employee'}>
        <View style={uiStyles.wrap}>
          <StatCard label="Today" value={formatMinutes(data?.summary.todaysMinutes ?? 0)} tone="dark" />
          <StatCard label="Submitted" value={formatMinutes(data?.summary.submittedMinutes ?? 0)} />
          <StatCard label="Approved week" value={formatMinutes(data?.summary.approvedWeekMinutes ?? 0)} tone="mint" />
        </View>
      </Section>

      <Section title="Clock actions" subtitle="Fast shift controls built for a mobile workday rhythm.">
        {error ? <AppText danger>{error}</AppText> : null}
        {!data?.summary.openEntry ? (
          <Button title={submitting ? 'Clocking in...' : 'Clock in'} onPress={handleClockIn} disabled={submitting} />
        ) : (
          <>
            <ListCard title="Open shift" subtitle={`Started ${formatDateTime(data.summary.openEntry.start_time)}`} right={<Badge label="Active" tone="accent" />} />
            <Label>Break minutes</Label>
            <Field keyboardType="numeric" value={breakMinutes} onChangeText={setBreakMinutes} />
            <Button title={submitting ? 'Clocking out...' : 'Clock out'} onPress={handleClockOut} disabled={submitting} />
          </>
        )}
      </Section>

      <Section title="Recent entries" subtitle="A cleaner recap of recent time records.">
        {data?.summary.recentEntries.length ? (
          data.summary.recentEntries.map((entry) => (
            <ListCard
              key={entry.id}
              title={entry.work_date}
              subtitle={formatDateTime(entry.start_time)}
              right={<Badge label={entry.status} tone={entry.status === 'approved' ? 'success' : 'ink'} />}
            />
          ))
        ) : (
          <EmptyState title="No time entries yet" detail="Clock-in and clock-out events will show up here." />
        )}
      </Section>
    </Screen>
  )
}
