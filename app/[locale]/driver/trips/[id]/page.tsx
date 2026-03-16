import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { CheckCircle2, Circle, Route, ShieldCheck } from 'lucide-react'
import { DriverCheckpointPanel } from '@/components/driver/driver-checkpoint-panel'
import { DriverDocumentList } from '@/components/driver/driver-document-list'
import { DriverProofOfDeliveryCard } from '@/components/driver/driver-proof-of-delivery-card'
import { DriverTripActionPanel } from '@/components/driver/driver-trip-action-panel'
import { TripStatusBadge } from '@/components/trips/trip-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentWorkforceEmployee } from '@/lib/auth/get-current-workforce-employee'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { uploadTripDocument } from '@/lib/documents/storage'
import { listTripDocuments } from '@/lib/db/queries/documents'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { listTripCheckpoints } from '@/lib/db/queries/trip-checkpoints'
import { getTripById } from '@/lib/db/queries/trips'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { getSignedDocumentUrl, transportDocumentsBucket } from '@/lib/documents/storage'
import { getOptionalString } from '@/lib/utils/forms'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { getTripRouteId } from '@/lib/utils/public-ids'

function buildHref(locale: string, tripId: string, previewDriverId?: string | null, extras?: Record<string, string>) {
  const params = new URLSearchParams()

  if (previewDriverId) {
    params.set('driver', previewDriverId)
  }

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return `/${locale}/driver/trips/${tripId}${query ? `?${query}` : ''}`
}

export default async function DriverTripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ driver?: string; success?: string; error?: string }>
}) {
  const { locale, id } = await params
  const { driver: previewDriverId, success, error } = await searchParams
  const context = await getDriverPortalContext(locale, previewDriverId)
  const { membership, activeDriver, previewDriverId: selectedDriverId } = context

  if (!activeDriver) {
    redirect(`/${locale}/driver`)
  }

  const [trip, tripDetail] = await Promise.all([
    getDriverMobileTripById(membership.company_id, activeDriver.id, id, context.supabase),
    getTripById(membership.company_id, id, context.supabase),
  ])

  const resolvedTrip = trip
  const showTimeModule = membership.enabledModules.includes('time')
  const workforceContext = showTimeModule && membership.role === 'driver' ? await getCurrentWorkforceEmployee(membership.company_id) : null
  const mobileTimeSummary = workforceContext?.employee
    ? await getMobileTimeSummary(membership.company_id, workforceContext.employee.id, context.supabase, membership.branchIds)
    : null
  const tripDocuments = resolvedTrip ? await listTripDocuments(membership.company_id, resolvedTrip.id, context.supabase, membership.branchIds) : []
  const checkpoints = resolvedTrip ? await listTripCheckpoints(membership.company_id, resolvedTrip.id, context.supabase, membership.branchIds) : []

  if (!resolvedTrip || !tripDetail || tripDetail.trip.driver_id !== activeDriver.id) {
    redirect(selectedDriverId ? `/${locale}/driver/trips?driver=${selectedDriverId}` : `/${locale}/driver/trips`)
  }

  const documentFeed = await Promise.all(
    tripDocuments.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )
  const checkpointTypes = new Set(checkpoints.map((checkpoint) => checkpoint.checkpoint_type))

  const tripChecklist = [
    {
      label: 'Shift active',
      done: !showTimeModule || membership.role !== 'driver' || Boolean(mobileTimeSummary?.openEntry) || resolvedTrip.status !== 'planned',
    },
    {
      label: 'Departed pickup',
      done: checkpointTypes.has('departed_pickup') || resolvedTrip.status !== 'planned',
    },
    {
      label: 'Arrived delivery',
      done: checkpointTypes.has('arrived_delivery') || checkpointTypes.has('delivered'),
    },
    {
      label: 'Delivery confirmed',
      done: checkpointTypes.has('delivered') || Boolean(tripDetail.trip.delivery_confirmation),
    },
    {
      label: 'Proof uploaded',
      done: documentFeed.length > 0,
    },
  ]

  async function uploadAction(formData: FormData) {
    'use server'

    const previewDriverId = getOptionalString(formData, 'preview_driver_id')
    const context = await getDriverPortalContext(locale, previewDriverId)

    if (!context.activeDriver) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'Driver context is missing for document upload.' }))
    }

    const trip = await getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase)
    if (!trip) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'Trip not found for the selected driver.' }))
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'Choose a document before uploading.' }))
    }

    try {
      await uploadTripDocument({
        companyId: context.membership.company_id,
        tripId: trip.id,
        userId: context.user.id,
        file,
      })
    } catch (uploadError) {
      redirect(
        buildHref(locale, id, previewDriverId, {
          error: uploadError instanceof Error ? uploadError.message : 'Unable to upload document.',
        }),
      )
    }

    redirect(buildHref(locale, id, previewDriverId, { success: 'Document uploaded successfully.' }))
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{resolvedTrip.customer_name}</CardTitle>
              <CardDescription className="mt-1">
                {resolvedTrip.pickup_location ?? 'Pickup TBD'} {'->'} {resolvedTrip.delivery_location ?? 'Delivery TBD'}
              </CardDescription>
            </div>
            <TripStatusBadge status={resolvedTrip.status as any} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">{success}</div> : null}
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">{error}</div> : null}
          <div><span className="font-medium text-slate-900">Trip Ref:</span> {getTripRouteId(resolvedTrip)}</div>
          <div><span className="font-medium text-slate-900">Order:</span> {resolvedTrip.order_number ?? 'Direct trip'}</div>
          <div><span className="font-medium text-slate-900">Scheduled:</span> {formatDateTime(resolvedTrip.scheduled_at)}</div>
          <div><span className="font-medium text-slate-900">Vehicle:</span> {resolvedTrip.vehicle_name}</div>
          <div><span className="font-medium text-slate-900">Customer contact:</span> {tripDetail.customer?.phone ?? tripDetail.customer?.email ?? '-'}</div>
          <div><span className="font-medium text-slate-900">Branch:</span> {tripDetail.branch?.name ?? 'No branch'}</div>
          <div className="flex flex-wrap gap-2">
            {resolvedTrip.invoice_number ? <Badge variant="success">{resolvedTrip.invoice_number}</Badge> : <Badge variant="default">Not invoiced</Badge>}
            {resolvedTrip.start_km ? <Badge variant="default">Start {toDisplayNumber(resolvedTrip.start_km)} km</Badge> : null}
            {resolvedTrip.end_km ? <Badge variant="success">End {toDisplayNumber(resolvedTrip.end_km)} km</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Field checklist</CardTitle>
          <CardDescription>The essentials to finish before dispatch closes the job and invoicing picks it up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tripChecklist.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-400" />}
              <span>{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Route brief</CardTitle>
          <CardDescription>Keep the live route, order context, and site notes visible while working from the phone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-4">
            <Route className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <div className="font-medium text-slate-950">Route</div>
              <div className="mt-1">{resolvedTrip.pickup_location ?? 'Pickup TBD'} {'->'} {resolvedTrip.delivery_location ?? 'Delivery TBD'}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <div className="font-medium text-slate-950">Dispatch note</div>
              <div className="mt-1">{tripDetail.order?.status ? `Order ${tripDetail.order.order_number ?? 'linked'} is ${tripDetail.order.status}.` : 'No linked order status.'}</div>
              <div className="mt-1 text-slate-500">{tripDetail.trip.notes ?? 'No route or handling notes recorded yet.'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {membership.role === 'driver' && !selectedDriverId ? (
        <DriverTripActionPanel
          tripId={getTripRouteId(resolvedTrip)}
          status={resolvedTrip.status as 'planned' | 'started' | 'completed' | 'invoiced'}
          hasOpenShift={Boolean(mobileTimeSummary?.openEntry)}
          allowCombinedShiftStart={showTimeModule}
          defaultWaitingMinutes={resolvedTrip.waiting_time_minutes ?? 0}
          defaultNotes={tripDetail.trip.notes ?? ''}
        />
      ) : null}

      {membership.role === 'driver' && !selectedDriverId ? (
        <DriverCheckpointPanel tripId={getTripRouteId(resolvedTrip)} existingCheckpointTypes={checkpoints.map((checkpoint) => checkpoint.checkpoint_type)} />
      ) : null}

      {membership.role === 'driver' && !selectedDriverId ? (
        <DriverProofOfDeliveryCard
          tripId={getTripRouteId(resolvedTrip)}
          currentRecipientName={tripDetail.trip.delivery_recipient_name}
          currentConfirmation={tripDetail.trip.delivery_confirmation}
          currentReceivedAt={tripDetail.trip.delivery_received_at}
        />
      ) : null}

      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Proof of delivery and receipts</CardTitle>
          <CardDescription>Capture a phone photo or upload a PDF directly from the field. Files are stored in the `{transportDocumentsBucket}` Supabase bucket when configured.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={uploadAction} className="space-y-3">
            {selectedDriverId ? <input type="hidden" name="preview_driver_id" value={selectedDriverId} /> : null}
            <div className="space-y-2">
              <Label htmlFor="camera_file">Capture delivery photo</Label>
              <Input id="camera_file" name="file" type="file" accept="image/*" capture="environment" />
            </div>
            <Button type="submit" className="w-full">Capture and upload photo</Button>
          </form>
          <form action={uploadAction} className="space-y-3">
            {selectedDriverId ? <input type="hidden" name="preview_driver_id" value={selectedDriverId} /> : null}
            <div className="space-y-2">
              <Label htmlFor="file">Choose file</Label>
              <Input id="file" name="file" type="file" accept="image/*,.pdf" />
            </div>
            <Button type="submit" variant="outline" className="w-full">Upload document</Button>
          </form>
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
            Document uploads still require connectivity. Trip and shift actions can queue offline and sync automatically when the device reconnects.
          </div>
          <DriverDocumentList documents={documentFeed} />
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Checkpoint history</CardTitle>
          <CardDescription>Arrival and departure stamps captured from the driver phone with location metadata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checkpoints.length > 0 ? (
            checkpoints.map((checkpoint) => (
              <div key={checkpoint.id} className="rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-950">{checkpoint.checkpoint_type.replaceAll('_', ' ')}</div>
                  <Badge variant="default">{formatDateTime(checkpoint.captured_at)}</Badge>
                </div>
                <div className="mt-2">
                  {checkpoint.latitude}, {checkpoint.longitude}
                </div>
                <div className="mt-1 text-slate-500">
                  Accuracy: {checkpoint.accuracy_meters ? `${Number(checkpoint.accuracy_meters).toFixed(0)} m` : 'n/a'}
                </div>
                {checkpoint.notes ? <div className="mt-2 text-slate-500">{checkpoint.notes}</div> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
              No live arrival or departure stamps captured yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Trip notes</CardTitle>
          <CardDescription>Field context stays visible for dispatch and invoicing follow-through.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div><span className="font-medium text-slate-900">Start time:</span> {formatDateTime(tripDetail.trip.start_time)}</div>
          <div><span className="font-medium text-slate-900">End time:</span> {formatDateTime(tripDetail.trip.end_time)}</div>
          <div><span className="font-medium text-slate-900">Recipient:</span> {tripDetail.trip.delivery_recipient_name ?? 'Not captured yet'}</div>
          <div><span className="font-medium text-slate-900">Delivery received:</span> {formatDateTime(tripDetail.trip.delivery_received_at)}</div>
          <div><span className="font-medium text-slate-900">Delivery confirmation:</span> {tripDetail.trip.delivery_confirmation ?? 'Not captured yet'}</div>
          <div><span className="font-medium text-slate-900">Notes:</span> {tripDetail.trip.notes ?? 'No notes recorded'}</div>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="w-full">
        <Link href={selectedDriverId ? `/driver/trips?driver=${selectedDriverId}` : '/driver/trips'}>Back to assigned trips</Link>
      </Button>
    </div>
  )
}
