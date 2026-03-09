import { ExternalLink, FileImage, FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/dates'

export type DocumentListItem = {
  id: string
  file_name: string
  mime_type: string | null
  created_at: string
  customer_name?: string | null
  trip_status?: string | null
  access_url?: string | null
}

export function DocumentList({
  documents,
  emptyState = 'No trip documents uploaded yet. Photos and POD files will appear here after the first upload.',
}: {
  documents: DocumentListItem[]
  emptyState?: string
}) {
  if (documents.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/90">
        <CardContent className="p-6 text-sm text-slate-600">{emptyState}</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => {
        const isImage = document.mime_type?.startsWith('image/')

        return (
          <Card key={document.id} className="border-slate-200/80 bg-white/95 shadow-softSm">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                {isImage ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="truncate text-sm font-medium text-slate-900">{document.file_name}</div>
                <div className="text-xs text-slate-500">{formatDateTime(document.created_at)}</div>
                <div className="flex flex-wrap gap-2">
                  {document.customer_name ? <Badge variant="default">{document.customer_name}</Badge> : null}
                  {document.trip_status ? <Badge variant="success">{document.trip_status}</Badge> : null}
                </div>
              </div>
              {document.access_url ? (
                <a
                  href={document.access_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
