import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { AppText, Button, EmptyState, Field, Label, LoadingState, Screen, Section, StatCard, uiStyles } from '@/src/components/ui'
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
      <Screen>
        <EmptyState title="Time module disabled" detail="Enable the time module for this tenant to use shift tracking in the native app." />
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading time summary" />
      </Screen>
    )
  }

  return (
    <Screen>
      <Section title="Shift summary" subtitle={data?.summary.employee?.full_name ?? 'No linked employee'}>
        <View style={uiStyles.wrap}>
          <StatCard label="Today" value={formatMinutes(data?.summary.todaysMinutes ?? 0)} />
          <StatCard label="Submitted" value={formatMinutes(data?.summary.submittedMinutes ?? 0)} />
          <StatCard label="Approved week" value={formatMinutes(data?.summary.approvedWeekMinutes ?? 0)} />
        </View>
      </Section>

      <Section title="Clock actions" subtitle="Uses the same versioned write endpoints as the future native app.">
        {error ? <AppText>{error}</AppText> : null}
        {!data?.summary.openEntry ? (
          <Button title={submitting ? 'Clocking in...' : 'Clock in'} onPress={handleClockIn} disabled={submitting} />
        ) : (
          <>
            <Text style={{ color: '#334155' }}>Open since {formatDateTime(data.summary.openEntry.start_time)}</Text>
            <Label>Break minutes</Label>
            <Field keyboardType="numeric" value={breakMinutes} onChangeText={setBreakMinutes} />
            <Button title={submitting ? 'Clocking out...' : 'Clock out'} onPress={handleClockOut} disabled={submitting} />
          </>
        )}
      </Section>

      <Section title="Recent entries" subtitle="Latest time records for the linked workforce employee.">
        {data?.summary.recentEntries.length ? (
          data.summary.recentEntries.map((entry) => (
            <Text key={entry.id} style={{ color: '#334155' }}>
              {entry.work_date} - {entry.status} - {formatDateTime(entry.start_time)}
            </Text>
          ))
        ) : (
          <EmptyState title="No time entries yet" detail="Clock-in and clock-out events will show up here." />
        )}
      </Section>
    </Screen>
  )
}
