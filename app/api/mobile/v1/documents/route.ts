import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { getSignedDocumentUrl } from '@/lib/documents/storage'
import { listDriverDocuments } from '@/lib/db/queries/documents'
import { mobileDocumentsResponseSchema } from '@/lib/mobile/contracts'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireMobileDriverApi(request, { previewDriverId })

  if (!context.ok) {
    return NextResponse.json(mobileDocumentsResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  const documents = await listDriverDocuments(context.membership.company_id, context.activeDriver.id, context.supabase, context.membership.branchIds)
  const documentFeed = await Promise.all(
    documents.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )

  return NextResponse.json(
    mobileDocumentsResponseSchema.parse({
      ok: true,
      documents: documentFeed,
    }),
  )
}
