import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { uploadGeneratedTripDocument } from '@/lib/documents/storage'
import { updateTripDeliveryProof } from '@/lib/db/mutations/trips'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { mobileDeliveryProofRequestSchema, mobileTripMutationResponseSchema } from '@/lib/mobile/contracts'
import { validateMobileRequest } from '@/lib/mobile/route-contract'

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl)
  if (!match) {
    throw new Error('Invalid proof image payload.')
  }

  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], 'base64'),
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validated = await validateMobileRequest(request, mobileDeliveryProofRequestSchema)
  if (!validated.ok) return validated.response

  const context = await requireMobileDriverApi(request)
  if (!context.ok) {
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  if (context.membership.role !== 'driver') {
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ error: 'Proof of delivery is only available to driver users.' }), { status: 403 })
  }

  const { id } = await params
  const trip = await getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase)
  if (!trip) {
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ error: 'Trip not found for this driver.' }), { status: 404 })
  }

  try {
    const proofImage = parseDataUrl(validated.data.signature_data_url)
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(proofImage.mimeType)) {
      throw new Error('Proof image must be captured as a PNG or JPEG image.')
    }
    if (proofImage.bytes.length === 0) {
      throw new Error('Proof image is empty.')
    }
    if (proofImage.bytes.length > 2 * 1024 * 1024) {
      throw new Error('Proof image is too large.')
    }

    const receivedAt = new Date().toISOString()
    const extension = proofImage.mimeType === 'image/png' ? 'png' : 'jpg'

    await uploadGeneratedTripDocument({
      companyId: context.membership.company_id,
      tripId: trip.id,
      userId: context.user.id,
      fileName: `delivery-proof-${trip.public_id ?? trip.id}.${extension}`,
      bytes: proofImage.bytes,
      mimeType: proofImage.mimeType,
    })

    const updatedTrip = await updateTripDeliveryProof(
      context.membership.company_id,
      context.user.id,
      trip.id,
      {
        delivery_confirmation: validated.data.delivery_confirmation,
        delivery_recipient_name: validated.data.delivery_recipient_name,
        delivery_received_at: receivedAt,
      },
      context.supabase,
    )

    return NextResponse.json(mobileTripMutationResponseSchema.parse({ ok: true, trip: updatedTrip }))
  } catch (error) {
    return NextResponse.json(
      mobileTripMutationResponseSchema.parse({ error: error instanceof Error ? error.message : 'Unable to capture proof of delivery.' }),
      { status: 400 },
    )
  }
}
