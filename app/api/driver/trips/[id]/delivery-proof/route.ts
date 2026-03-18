import { NextResponse } from 'next/server'

import { requireApiCompany } from '@/lib/auth/require-api-company'
import { getCurrentDriver } from '@/lib/auth/get-current-driver'
import { uploadGeneratedTripDocument } from '@/lib/documents/storage'
import { updateTripDeliveryProof } from '@/lib/db/mutations/trips'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'

const MAX_PROOF_IMAGE_BYTES = 8 * 1024 * 1024

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
  const context = await requireApiCompany()
  if (!context) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (context.membership.role !== 'driver' || !context.membership.enabledModules.includes('transport')) {
    return NextResponse.json({ error: 'Proof of delivery is only available to driver users.' }, { status: 403 })
  }

  const driver = await getCurrentDriver(context.membership.company_id, context.user.id, context.user.email, context.supabase)
  if (!driver) {
    return NextResponse.json({ error: 'No linked driver profile found for this login.' }, { status: 400 })
  }

  const { id } = await params
  const trip = await getDriverMobileTripById(context.membership.company_id, driver.id, id, context.supabase)
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found for this driver.' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const recipientName = String(body.delivery_recipient_name ?? '').trim()
    if (!recipientName) {
      throw new Error('Recipient name is required.')
    }

    const confirmation = String(body.delivery_confirmation ?? '').trim()
    if (!confirmation) {
      throw new Error('Delivery confirmation is required.')
    }

    const signatureDataUrl = String(body.signature_data_url ?? '').trim()
    if (!signatureDataUrl) {
      throw new Error('Recipient signature is required.')
    }

    const proofImage = parseDataUrl(signatureDataUrl)
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(proofImage.mimeType)) {
      throw new Error('Proof image must be captured as a PNG or JPEG image.')
    }
    if (proofImage.bytes.length === 0) {
      throw new Error('Proof image is empty.')
    }
    if (proofImage.bytes.length > MAX_PROOF_IMAGE_BYTES) {
      throw new Error('Proof image is too large. Maximum size is 8 MB.')
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
        delivery_confirmation: confirmation,
        delivery_recipient_name: recipientName,
        delivery_received_at: receivedAt,
      },
      context.supabase,
    )

    return NextResponse.json({ ok: true, trip: updatedTrip })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to capture proof of delivery.' }, { status: 400 })
  }
}
