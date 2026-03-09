import { DocumentList, type DocumentListItem } from '@/components/documents/document-list'

export function DriverDocumentList({ documents }: { documents: DocumentListItem[] }) {
  return <DocumentList documents={documents} emptyState="No trip documents uploaded yet. Photos and POD files will appear here after the first field upload." />
}
