import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { Link } from '@/i18n/navigation'
import { DriverDocumentList } from '@/components/driver/driver-document-list'
import { TripStatusBadge } from '@/components/trips/trip-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { canManageTripExecution } from '@/lib/auth/permissions'
import { uploadTripDocument } from '@/lib/documents/storage'
import { completeTrip, startTrip } from '@/lib/db/mutations/trips'
import { listTripDocuments } from '@/lib/db/queries/documents'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { getTripById } from '@/lib/db/queries/trips'
import { getSignedDocumentUrl, transportDocumentsBucket } from '@/lib/documents/storage'
import { getOptionalString } from '@/lib/utils/forms'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { getTripRouteId } from '@/lib/utils/public-ids'

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (value === null) return undefined
  const text = String(value).trim()
  if (!text) return undefined
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

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
  const tripDocuments = resolvedTrip ? await listTripDocuments(membership.company_id, resolvedTrip.id, context.supabase) : []

  if (!resolvedTrip || !tripDetail || tripDetail.trip.driver_id !== activeDriver.id) {
    redirect(selectedDriverId ? `/${locale}/driver/trips?driver=${selectedDriverId}` : `/${locale}/driver/trips`)
  }

  const documentFeed = await Promise.all(
    tripDocuments.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )

  async function startAction(formData: FormData) {
    'use server'

    const previewDriverId = getOptionalString(formData, 'preview_driver_id')
    const context = await getDriverPortalContext(locale, previewDriverId)

    if (!context.activeDriver || !canManageTripExecution(context.membership.role)) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'You do not have access to start this trip.' }))
    }

    const trip = await getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase)
    if (!trip) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'Trip not found for the selected driver.' }))
    }

    try {
      await startTrip(
        context.membership.company_id,
        context.user.id,
        trip.id,
        {
          start_km: parseOptionalNumber(formData.get('start_km')),
          notes: getOptionalString(formData, 'notes') ?? undefined,
        },
        context.supabase,
      )
    } catch (error) {
      redirect(buildHref(locale, id, previewDriverId, { error: error instanceof Error ? error.message : 'Unable to start trip.' }))
    }

    revalidatePath(`/${locale}/driver`)
    revalidatePath(`/${locale}/driver/trips`)
    revalidatePath(`/${locale}/driver/trips/${id}`)
    redirect(buildHref(locale, id, previewDriverId, { success: 'Trip started successfully.' }))
  }

  async function completeAction(formData: FormData) {
    'use server'

    const previewDriverId = getOptionalString(formData, 'preview_driver_id')
    const context = await getDriverPortalContext(locale, previewDriverId)

    if (!context.activeDriver || !canManageTripExecution(context.membership.role)) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'You do not have access to complete this trip.' }))
    }

    const trip = await getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase)
    if (!trip) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'Trip not found for the selected driver.' }))
    }

    const waitingTime = parseOptionalNumber(formData.get('waiting_time_minutes'))

    try {
      await completeTrip(
        context.membership.company_id,
        context.user.id,
        trip.id,
        {
          end_km: parseOptionalNumber(formData.get('end_km')),
          waiting_time_minutes: waitingTime !== undefined ? Math.max(0, Math.round(waitingTime)) : undefined,
          delivery_confirmation: getOptionalString(formData, 'delivery_confirmation') ?? undefined,
          notes: getOptionalString(formData, 'notes') ?? undefined,
        },
        context.supabase,
      )
    } catch (error) {
      redirect(buildHref(locale, id, previewDriverId, { error: error instanceof Error ? error.message : 'Unable to complete trip.' }))
    }

    revalidatePath(`/${locale}/driver`)
    revalidatePath(`/${locale}/driver/trips`)
    revalidatePath(`/${locale}/driver/trips/${id}`)
    redirect(buildHref(locale, id, previewDriverId, { success: 'Trip completed successfully.' }))
  }

  async function uploadAction(formData: FormData) {
    'use server'

    const previewDriverId = getOptionalString(formData, 'preview_driver_id')
    const context = await getDriverPortalContext(locale, previewDriverId)

    if (!context.activeDriver || !canManageTripExecution(context.membership.role)) {
      redirect(buildHref(locale, id, previewDriverId, { error: 'You do not have access to upload documents for this trip.' }))
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
    } catch (error) {
      redirect(buildHref(locale, id, previewDriverId, { error: error instanceof Error ? error.message : 'Unable to upload document.' }))
    }

    revalidatePath(`/${locale}/driver/documents`)
    revalidatePath(`/${locale}/driver/trips/${id}`)
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
          <div className="flex flex-wrap gap-2">
            {resolvedTrip.invoice_number ? <Badge variant="success">{resolvedTrip.invoice_number}</Badge> : <Badge variant="default">Not invoiced</Badge>}
            {resolvedTrip.start_km ? <Badge variant="default">Start {toDisplayNumber(resolvedTrip.start_km)} km</Badge> : null}
            {resolvedTrip.end_km ? <Badge variant="success">End {toDisplayNumber(resolvedTrip.end_km)} km</Badge> : null}
          </div>
        </CardContent>
      </Card>

      {resolvedTrip.status === 'planned' ? (
        <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
          <CardHeader className="pb-4">
            <CardTitle>Start trip</CardTitle>
            <CardDescription>Capture the starting odometer and a short dispatch note before departure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={startAction} className="space-y-3">
              {selectedDriverId ? <input type="hidden" name="preview_driver_id" value={selectedDriverId} /> : null}
              <div className="space-y-2">
                <Label htmlFor="start_km">Start odometer (km)</Label>
                <Input id="start_km" name="start_km" inputMode="decimal" placeholder="182450" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_notes">Kickoff note</Label>
                <Textarea id="start_notes" name="notes" placeholder="Loaded, vehicle checked, leaving terminal now." />
              </div>
              <Button type="submit" className="w-full">Start trip</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {resolvedTrip.status === 'started' ? (
        <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
          <CardHeader className="pb-4">
            <CardTitle>Complete trip</CardTitle>
            <CardDescription>Record the delivery confirmation, final odometer, and any wait time from the field.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={completeAction} className="space-y-3">
              {selectedDriverId ? <input type="hidden" name="preview_driver_id" value={selectedDriverId} /> : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="end_km">End odometer</Label>
                  <Input id="end_km" name="end_km" inputMode="decimal" placeholder="182870" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waiting_time_minutes">Waiting min</Label>
                  <Input id="waiting_time_minutes" name="waiting_time_minutes" inputMode="numeric" defaultValue={String(resolvedTrip.waiting_time_minutes ?? 0)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_confirmation">Delivery confirmation</Label>
                <Input id="delivery_confirmation" name="delivery_confirmation" placeholder="Signed by warehouse contact" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complete_notes">Driver note</Label>
                <Textarea id="complete_notes" name="notes" defaultValue={tripDetail.trip.notes ?? ''} placeholder="Queue time, unloading notes, route issues." />
              </div>
              <Button type="submit" className="w-full">Complete trip</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Proof of delivery and receipts</CardTitle>
          <CardDescription>Upload photos or PDFs directly from the phone. Files are stored in the `{transportDocumentsBucket}` Supabase bucket when configured.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={uploadAction} className="space-y-3">
            {selectedDriverId ? <input type="hidden" name="preview_driver_id" value={selectedDriverId} /> : null}
            <div className="space-y-2">
              <Label htmlFor="file">Choose file</Label>
              <Input id="file" name="file" type="file" accept="image/*,.pdf" />
            </div>
            <Button type="submit" variant="outline" className="w-full">Upload document</Button>
          </form>
          <DriverDocumentList documents={documentFeed} />
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
