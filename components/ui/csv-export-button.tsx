import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function CsvExportButton({ resource, label = 'Export CSV' }: { resource: string; label?: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={`/api/exports/${resource}`} download>
        <Download className="h-4 w-4" />
        {label}
      </a>
    </Button>
  )
}
