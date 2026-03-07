import 'server-only'

import type { TableRow } from '@/types/database'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { insertAuditLog } from '@/lib/db/shared'

export const transportDocumentsBucket = 'transport-documents'

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function uploadTripDocument({
  companyId,
  tripId,
  userId,
  file,
}: {
  companyId: string
  tripId: string
  userId: string
  file: File
}) {
  if (!file || file.size === 0) {
    throw new Error('Choose a file before uploading.')
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Files larger than 10 MB are not supported in the mobile workflow yet.')
  }

  const admin = createSupabaseAdminClient()
  const safeName = sanitizeFileName(file.name || 'document')
  const filePath = `${companyId}/trip/${tripId}/${Date.now()}-${safeName}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage.from(transportDocumentsBucket).upload(filePath, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes('bucket')) {
      throw new Error(`Storage bucket "${transportDocumentsBucket}" is not configured yet.`)
    }

    throw new Error(uploadError.message)
  }

  const { data, error } = await admin
    .from('documents')
    .insert({
      company_id: companyId,
      related_type: 'trip',
      related_id: tripId,
      file_name: file.name,
      file_path: filePath,
      mime_type: file.type || null,
      uploaded_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    await admin.storage.from(transportDocumentsBucket).remove([filePath])
    throw error
  }

  const document = data as TableRow<'documents'>

  await insertAuditLog(admin, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'document',
    entity_id: document.id,
    action: 'upload_trip_document',
    new_values: document,
  })

  return document
}

export async function getSignedDocumentUrl(filePath: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.storage.from(transportDocumentsBucket).createSignedUrl(filePath, 60 * 60)

  if (error) {
    return null
  }

  return data.signedUrl
}
