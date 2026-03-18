import * as Linking from 'expo-linking'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { AppText, Badge, Button, EmptyState, HeroCard, ListCard, LoadingState, Screen, Section } from '@/src/components/ui'
import { formatDateTime } from '@/src/lib/format'
import { mobileApi } from '@/src/lib/mobile-api'
import { useAuth } from '@/src/providers/auth-provider'
import type { MobileDocumentsResponse } from '@/src/types/mobile'

export default function DocumentsScreen() {
  const { session, companyId } = useAuth()
  const [data, setData] = useState<Extract<MobileDocumentsResponse, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    mobileApi
      .documents(session, companyId)
      .then((response) => {
        if ('ok' in response && response.ok) {
          setData(response)
          setError(null)
        }
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Failed to load documents.'))
      .finally(() => setLoading(false))
  }, [companyId, session])

  if (loading) {
    return (
      <Screen showDock>
        <LoadingState label="Loading documents" />
      </Screen>
    )
  }

  return (
    <Screen showDock>
      <HeroCard
        eyebrow="Documents"
        title={`${data?.documents.length ?? 0} file${(data?.documents.length ?? 0) === 1 ? '' : 's'} ready`}
        subtitle="Proof of delivery, receipts, and trip files stay in one place with clean access from the phone."
      >
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Badge label={`${data?.documents.filter((document) => Boolean(document.access_url)).length ?? 0} openable`} tone="success" />
        </View>
      </HeroCard>

      <Section title="Document library" subtitle="Signed URLs from the mobile API when storage access is available.">
        {error ? <AppText danger>{error}</AppText> : null}
        {data?.documents.length ? (
          data.documents.map((document) => (
            <ListCard
              key={document.id}
              title={document.file_name}
              subtitle={formatDateTime(document.created_at)}
              right={
                <Button
                  title={document.access_url ? 'Open' : 'Locked'}
                  variant={document.access_url ? 'secondary' : 'ghost'}
                  onPress={() => {
                    if (document.access_url) {
                      void Linking.openURL(document.access_url)
                    }
                  }}
                />
              }
            />
          ))
        ) : (
          <EmptyState title="No documents" detail="Trip receipts, proof of delivery, and signatures will appear here." />
        )}
      </Section>
      {!data?.documents.some((document) => document.access_url) ? (
        <AppText muted>No signed access URLs were returned for the current document set.</AppText>
      ) : null}
    </Screen>
  )
}
