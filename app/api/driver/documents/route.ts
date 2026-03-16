import { NextResponse } from 'next/server'

import { requireDriverApi } from '@/lib/auth/require-driver-api'
import { getSignedDocumentUrl } from '@/lib/documents/storage'
import { listDriverDocuments } from '@/lib/db/queries/documents'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireDriverApi({ previewDriverId })

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }

  const documents = await listDriverDocuments(
    context.membership.company_id,
    context.activeDriver.id,
    context.supabase,
    context.membership.branchIds,
  )

  const documentFeed = await Promise.all(
    documents.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )

  return NextResponse.json({
    ok: true,
    documents: documentFeed,
  })
}
