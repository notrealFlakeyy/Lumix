import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'

import { AppText, Button, EmptyState, Field, Label, LoadingState, Screen, Section } from '@/src/components/ui'
import { formatDateTime, formatNumber, formatTripStatus, formatMinutes } from '@/src/lib/format'
import { mobileApi } from '@/src/lib/mobile-api'
import { useAuth } from '@/src/providers/auth-provider'
import type { MobileTripDetailResponse } from '@/src/types/mobile'

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, companyId, me } = useAuth()
  const [data, setData] = useState<Extract<MobileTripDetailResponse, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [startKm, setStartKm] = useState('')
  const [endKm, setEndKm] = useState('')
  const [waitingMinutes, setWaitingMinutes] = useState('')
  const [deliveryConfirmation, setDeliveryConfirmation] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)

  async function load() {
    if (!session || !id) return

    try {
      setLoading(true)
      const response = await mobileApi.tripDetail(session, id, companyId)
      if ('ok' in response && response.ok) {
        setData(response)
        setError(null)
        setProofError(null)
        setDeliveryConfirmation((current) => current || response.trip.delivery_confirmation || '')
        setRecipientName((current) => current || response.trip.delivery_recipient_name || '')
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load trip detail.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [companyId, id, session])

  async function handleStart() {
    if (!session || !id) return

    try {
      setSubmitting(true)
      await mobileApi.startTrip(session, id, { start_km: startKm ? Number(startKm) : null }, companyId)
      await load()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to start trip.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete() {
    if (!session || !id) return

    try {
      setSubmitting(true)
      await mobileApi.completeTrip(
        session,
        id,
        {
          end_km: endKm ? Number(endKm) : null,
          waiting_time_minutes: waitingMinutes ? Number(waitingMinutes) : 0,
          delivery_confirmation: deliveryConfirmation || null,
        },
        companyId,
      )
      await load()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to complete trip.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCheckpoint(type: 'arrived_pickup' | 'departed_pickup' | 'arrived_delivery' | 'delivered') {
    if (!session || !id) return

    try {
      setSubmitting(true)
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        throw new Error('Location permission is required to capture checkpoints.')
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      await mobileApi.checkpoint(
        session,
        id,
        {
          checkpoint_type: type,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_meters: position.coords.accuracy ?? null,
        },
        companyId,
      )
      await load()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save checkpoint.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitDeliveryProof(source: 'camera' | 'library') {
    if (!session || !id) return

    if (!recipientName.trim()) {
      const message = 'Recipient name is required before uploading proof of delivery.'
      setProofError(message)
      Alert.alert('Missing recipient name', message)
      return
    }

    if (!deliveryConfirmation.trim()) {
      const message = 'Delivery confirmation is required before uploading proof of delivery.'
      setProofError(message)
      Alert.alert('Missing delivery confirmation', message)
      return
    }

    try {
      setSubmitting(true)
      setProofError(null)

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        const message = source === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.'
        setProofError(message)
        Alert.alert('Permission needed', message)
        return
      }

      const pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              base64: true,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              base64: true,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            })

      if (pickerResult.canceled) {
        return
      }

      const asset = pickerResult.assets[0]
      if (!asset?.base64) {
        throw new Error('The selected image could not be prepared for upload.')
      }

      const mimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
      await mobileApi.deliveryProof(
        session,
        id,
        {
          delivery_recipient_name: recipientName.trim(),
          delivery_confirmation: deliveryConfirmation.trim(),
          signature_data_url: `data:${mimeType};base64,${asset.base64}`,
        },
        companyId,
      )

      await load()
      Alert.alert('Proof uploaded', 'Delivery proof has been saved to the trip.')
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Failed to upload proof of delivery.'
      setProofError(message)
      Alert.alert('Upload failed', message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading trip detail" />
      </Screen>
    )
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState title="Trip not found" detail={error ?? 'No trip detail was returned.'} />
      </Screen>
    )
  }

  const trip = data.trip

  return (
    <Screen>
      <Section title={trip.customer_name ?? 'Trip'} subtitle={`${formatTripStatus(trip.status)} - ${trip.order_number ?? trip.public_id}`}>
        <AppText muted>{trip.pickup_location ?? 'Pickup TBD'} {'->'} {trip.delivery_location ?? 'Delivery TBD'}</AppText>
        <AppText muted>Scheduled {formatDateTime(trip.scheduled_at ?? trip.start_time ?? trip.created_at)}</AppText>
        <AppText muted>Distance {formatNumber(trip.distance_km, 1)} km - Waiting {formatMinutes(trip.waiting_time_minutes)}</AppText>
      </Section>

      <Section title="Driver actions" subtitle="These actions use the versioned native-ready write endpoints.">
        {error ? <AppText>{error}</AppText> : null}
        {me?.membership.role === 'driver' && trip.status === 'planned' ? (
          <>
            <Label>Start odometer</Label>
            <Field keyboardType="numeric" value={startKm} onChangeText={setStartKm} />
            <Button title={submitting ? 'Starting...' : 'Start trip'} onPress={handleStart} disabled={submitting} />
          </>
        ) : null}

        {me?.membership.role === 'driver' && trip.status === 'started' ? (
          <>
            <Label>End odometer</Label>
            <Field keyboardType="numeric" value={endKm} onChangeText={setEndKm} />
            <Label>Waiting minutes</Label>
            <Field keyboardType="numeric" value={waitingMinutes} onChangeText={setWaitingMinutes} />
            <Label>Delivery confirmation</Label>
            <Field value={deliveryConfirmation} onChangeText={setDeliveryConfirmation} />
            <Button title={submitting ? 'Completing...' : 'Complete trip'} onPress={handleComplete} disabled={submitting} />
          </>
        ) : null}

        {me?.membership.role !== 'driver' ? (
          <AppText muted>Preview users can inspect the trip here, but write actions stay reserved for real driver accounts.</AppText>
        ) : null}
      </Section>

      <Section title="Checkpoints" subtitle="GPS checkpoints are already supported for the web mobile flow and native API.">
        <View style={{ gap: 10 }}>
          <Button title="Arrived pickup" variant="secondary" onPress={() => void handleCheckpoint('arrived_pickup')} disabled={submitting} />
          <Button title="Departed pickup" variant="secondary" onPress={() => void handleCheckpoint('departed_pickup')} disabled={submitting} />
          <Button title="Arrived delivery" variant="secondary" onPress={() => void handleCheckpoint('arrived_delivery')} disabled={submitting} />
          <Button title="Delivered" variant="secondary" onPress={() => void handleCheckpoint('delivered')} disabled={submitting} />
        </View>
        {data.checkpoints.length ? (
          data.checkpoints.map((checkpoint) => (
            <Text key={checkpoint.id} style={{ color: '#334155' }}>
              {checkpoint.checkpoint_type} - {formatDateTime(checkpoint.captured_at)}
            </Text>
          ))
        ) : (
          <EmptyState title="No checkpoints yet" detail="Arrival and delivery stamps will show here." />
        )}
      </Section>

      <Section title="Proof of delivery" subtitle="Capture a delivery image and attach the recipient confirmation directly from the phone.">
        {proofError ? <AppText>{proofError}</AppText> : null}
        {trip.delivery_received_at ? (
          <AppText muted>
            Existing proof captured for {trip.delivery_recipient_name ?? 'recipient'} at {formatDateTime(trip.delivery_received_at)}.
          </AppText>
        ) : null}
        <Label>Recipient name</Label>
        <Field value={recipientName} onChangeText={setRecipientName} />
        <Label>Delivery confirmation</Label>
        <Field value={deliveryConfirmation} onChangeText={setDeliveryConfirmation} />
        <Button title={submitting ? 'Opening camera...' : 'Capture delivery proof'} onPress={() => void submitDeliveryProof('camera')} disabled={submitting} />
        <Button title={submitting ? 'Selecting photo...' : 'Choose proof from photos'} variant="secondary" onPress={() => void submitDeliveryProof('library')} disabled={submitting} />
        <AppText muted>Fill recipient name and delivery confirmation first. The uploaded proof is stored in trip documents and updates the delivery confirmation on the trip.</AppText>
      </Section>

      <Section title="Documents" subtitle="Proof and receipts already linked to this trip.">
        {data.documents.length ? (
          data.documents.map((document) => (
            <Text key={document.id} style={{ color: '#334155' }}>
              {document.file_name} - {formatDateTime(document.created_at)}
            </Text>
          ))
        ) : (
          <EmptyState title="No trip documents yet" detail="Delivery proof and receipts uploaded from mobile will show here." />
        )}
      </Section>
    </Screen>
  )
}
