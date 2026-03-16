import * as Linking from 'expo-linking'
import { useEffect, useState } from 'react'
import { Text } from 'react-native'

import { AppText, Button, EmptyState, LoadingState, Screen, Section } from '@/src/components/ui'
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
      <Screen>
        <LoadingState label="Loading documents" />
      </Screen>
    )
  }

  return (
    <Screen>
      <Section title="Documents" subtitle="Signed URLs from `/api/mobile/v1/documents`.">
        {error ? <AppText>{error}</AppText> : null}
        {data?.documents.length ? (
          data.documents.map((document) => (
            <Button
              key={document.id}
              title={`${document.file_name} - ${formatDateTime(document.created_at)}`}
              variant="secondary"
              onPress={() => {
                if (document.access_url) {
                  void Linking.openURL(document.access_url)
                }
              }}
            />
          ))
        ) : (
          <EmptyState title="No documents" detail="Trip receipts, proof of delivery, and signatures will appear here." />
        )}
      </Section>
      {!data?.documents.some((document) => document.access_url) ? (
        <Text style={{ color: '#64748b' }}>No signed access URLs were returned for the current document set.</Text>
      ) : null}
    </Screen>
  )
}
