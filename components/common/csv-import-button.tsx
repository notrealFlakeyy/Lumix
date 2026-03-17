'use client'

import * as React from 'react'
import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { CsvImportDialog } from '@/components/common/csv-import-dialog'

type ImportResource = 'customers' | 'vehicles' | 'drivers'

export function CsvImportButton({
  resource,
  companyId,
}: {
  resource: ImportResource
  companyId: string
}) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>
      <CsvImportDialog
        resource={resource}
        companyId={companyId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
