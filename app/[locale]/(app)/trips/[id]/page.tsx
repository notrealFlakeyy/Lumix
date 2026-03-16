import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { DocumentList } from '@/components/documents/document-list'
import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { TripStatusBadge } from '@/components/trips/trip-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { canManageInvoices, canManageTripExecution } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { createInvoiceFromTrip } from '@/lib/db/mutations/invoices'
import { completeTrip, startTrip } from '@/lib/db/mutations/trips'
import { listTripDocuments } from '@/lib/db/queries/documents'
import { getTripById } from '@/lib/db/queries/trips'
import { getSignedDocumentUrl, transportDocumentsBucket, uploadTripDocument } from '@/lib/documents/storage'
import { formatDateTime } from '@/lib/utils/dates'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'
import { toDisplayNumber, toNumber } from '@/lib/utils/numbers'

function buildTripDetailHref(locale: string, id: string, extras?: Record<string, string>) {
  const params = new URLSearchParams(extras)
  const query = params.toString()
  return `/${locale}/trips/${id}${query ? `?${query}` : ''}`
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { locale, id } = await params
  const { success, error } = await searchParams
  const { membership } = await requireCompany(locale)
  const result = await getTripById(membership.company_id, id, undefined, membership.branchIds)
  if (!result) return null

  async function startAction() {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageTripExecution(membership.role)) throw new Error('Insufficient permissions.')
    await startTrip(membership.company_id, user.id, trip.id)
    revalidatePath(`/${locale}/trips/${id}`)
    revalidatePath(`/${locale}/trips`)
  }

  async function completeAction() {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageTripExecution(membership.role)) throw new Error('Insufficient permissions.')
    await completeTrip(membership.company_id, user.id, trip.id)
    revalidatePath(`/${locale}/trips/${id}`)
    revalidatePath(`/${locale}/trips`)
  }

  async function invoiceAction() {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')
    const invoice = await createInvoiceFromTrip(membership.company_id, user.id, trip.id)
    revalidatePath(`/${locale}/trips/${id}`)
    revalidatePath(`/${locale}/invoices`)
    redirect(`/${locale}/invoices/${invoice.id}`)
  }

  const { trip, branch, customer, vehicle, driver, order, invoice } = result
  const tripDocuments = await listTripDocuments(membership.company_id, trip.id, undefined, membership.branchIds)
  const documentFeed = await Promise.all(
    tripDocuments.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )

  async function uploadAction(formData: FormData) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageTripExecution(membership.role)) {
      redirect(buildTripDetailHref(locale, id, { error: 'Insufficient permissions.' }))
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      redirect(buildTripDetailHref(locale, id, { error: 'Choose a document before uploading.' }))
    }

    try {
      await uploadTripDocument({
        companyId: membership.company_id,
        tripId: trip.id,
        userId: user.id,
        file,
      })
    } catch (uploadError) {
      redirect(buildTripDetailHref(locale, id, { error: uploadError instanceof Error ? uploadError.message : 'Unable to upload document.' }))
    }

    revalidatePath(`/${locale}/trips/${id}`)
    revalidatePath(`/${locale}/driver/documents`)
    redirect(buildTripDetailHref(locale, id, { success: 'Trip document uploaded successfully.' }))
  }

  return (
    <div className="space-y-6">
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{success}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">{error}</div> : null}

      <PageHeader
        title={`Trip ${getTripDisplayId(trip)}`}
        description="Trip execution details, odometer values, notes, and linked commercial documents."
        actions={
          <Button asChild variant="outline">
            <Link href={`/trips/${getTripRouteId(trip)}/edit`}>Edit trip</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3"><span className="font-medium text-slate-900">Status:</span> <TripStatusBadge status={trip.status as any} /></div>
            <div><span className="font-medium text-slate-900">Branch:</span> {branch?.name ?? 'No branch assigned'}</div>
            <div><span className="font-medium text-slate-900">Customer:</span> {customer?.name ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Vehicle:</span> {vehicle ? `${vehicle.registration_number} ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}` : 'Unassigned'}</div>
            <div><span className="font-medium text-slate-900">Driver:</span> {driver?.full_name ?? 'Unassigned'}</div>
            <div><span className="font-medium text-slate-900">Linked Order:</span> {order ? <Link href={`/orders/${order.id}`}>{order.order_number}</Link> : 'No linked order'}</div>
            <div><span className="font-medium text-slate-900">Linked Invoice:</span> {invoice ? <Link href={`/invoices/${invoice.id}`}>{invoice.invoice_number}</Link> : 'No linked invoice'}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Timing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div><span className="font-medium text-slate-900">Start Time:</span> {formatDateTime(trip.start_time)}</div>
            <div><span className="font-medium text-slate-900">End Time:</span> {formatDateTime(trip.end_time)}</div>
            <div><span className="font-medium text-slate-900">Waiting Time:</span> {trip.waiting_time_minutes} min</div>
            <div><span className="font-medium text-slate-900">Start KM:</span> {trip.start_km ? `${toDisplayNumber(trip.start_km)} km` : '-'}</div>
            <div><span className="font-medium text-slate-900">End KM:</span> {trip.end_km ? `${toDisplayNumber(trip.end_km)} km` : '-'}</div>
            <div><span className="font-medium text-slate-900">Distance KM:</span> {trip.distance_km ? `${toNumber(trip.distance_km)} km` : '-'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Delivery Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">{trip.delivery_confirmation ?? 'No delivery confirmation captured yet.'}</CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">{trip.notes ?? 'No notes recorded.'}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Trip Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Upload proof of delivery, receipts, or dispatch attachments for this trip. Files use signed URLs from the `{transportDocumentsBucket}` bucket when storage is configured.
          </div>
          <form action={uploadAction} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="trip_document_file">Choose file</Label>
              <Input id="trip_document_file" name="file" type="file" accept="image/*,.pdf" />
            </div>
            <Button type="submit" variant="outline">Upload document</Button>
          </form>
          <DocumentList documents={documentFeed} emptyState="No trip documents uploaded yet. Use this panel to keep PODs, receipts, and dispatch attachments attached to the live trip record." />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <form action={startAction}>
          <Button type="submit" variant="outline">Start trip</Button>
        </form>
        <form action={completeAction}>
          <Button type="submit" variant="outline">Complete trip</Button>
        </form>
        {!invoice ? (
          <form action={invoiceAction}>
            <Button type="submit">Create invoice from trip</Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
