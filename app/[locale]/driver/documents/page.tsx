import { redirect } from 'next/navigation'

import { DriverDocumentList } from '@/components/driver/driver-document-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { listDriverDocuments } from '@/lib/db/queries/documents'
import { getSignedDocumentUrl, transportDocumentsBucket } from '@/lib/documents/storage'

export default async function DriverDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ driver?: string }>
}) {
  const { locale } = await params
  const { driver: previewDriverId } = await searchParams
  const context = await getDriverPortalContext(locale, previewDriverId)
  const { membership, activeDriver } = context

  if (!activeDriver) {
    redirect(`/${locale}/driver`)
  }

  const documents = await listDriverDocuments(membership.company_id, activeDriver.id, context.supabase, membership.branchIds)
  const documentFeed = await Promise.all(
    documents.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )

  return (
    <div className="space-y-4">
      <Card className="shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Trip documents</CardTitle>
          <CardDescription>
            Proof of delivery, receipts, and field attachments for {activeDriver.full_name}. Storage reads use signed URLs from the `{transportDocumentsBucket}` bucket when available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriverDocumentList documents={documentFeed} />
        </CardContent>
      </Card>
    </div>
  )
}
