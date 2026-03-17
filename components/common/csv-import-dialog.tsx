'use client'

import * as React from 'react'
import { Upload, CheckCircle2, XCircle, FileUp, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ImportResource = 'customers' | 'vehicles' | 'drivers'

type ValidRow = { row: number; data: Record<string, unknown> }
type InvalidRow = { row: number; errors: string[] }

type PreviewResponse = {
  valid: ValidRow[]
  invalid: InvalidRow[]
  total: number
}

type ConfirmResponse = {
  imported: number
  skipped: number
  errors: Array<{ row: number; error: string }>
  total: number
}

type Step = 'upload' | 'preview' | 'done'

export function CsvImportDialog({
  resource,
  companyId: _companyId,
  open,
  onOpenChange,
  onSuccess,
}: {
  resource: ImportResource
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [step, setStep] = React.useState<Step>('upload')
  const [file, setFile] = React.useState<File | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null)
  const [result, setResult] = React.useState<ConfirmResponse | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setFile(null)
    setIsLoading(false)
    setError(null)
    setPreview(null)
    setResult(null)
    setIsDragging(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  function handleFileSelect(selectedFile: File) {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a .csv file.')
      return
    }
    setFile(selectedFile)
    setError(null)
  }

  async function handlePreview() {
    if (!file) return
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/imports/${resource}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        setError(payload?.error ?? 'Failed to parse CSV file.')
        setIsLoading(false)
        return
      }

      const data: PreviewResponse = await res.json()
      setPreview(data)
      setStep('preview')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirm() {
    if (!file) return
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/imports/${resource}?confirm=true`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        setError(payload?.error ?? 'Import failed.')
        setIsLoading(false)
        return
      }

      const data: ConfirmResponse = await res.json()
      setResult(data)
      setStep('done')
      onSuccess()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const resourceLabel = resource.charAt(0).toUpperCase() + resource.slice(1)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {resourceLabel}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import {resource}. Download a{' '}
            <a
              href={`/api/templates/${resource}`}
              download
              className="text-sky-600 underline hover:text-sky-700"
            >
              CSV template
            </a>{' '}
            to see the expected format.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 transition-colors ${
                isDragging
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const droppedFile = e.dataTransfer.files[0]
                if (droppedFile) handleFileSelect(droppedFile)
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
            >
              <FileUp className="mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600">
                {file ? file.name : 'Drag & drop a CSV file here, or click to browse'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (selected) handleFileSelect(selected)
                }}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!file || isLoading}
                onClick={handlePreview}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">
                Total rows: <strong>{preview.total}</strong>
              </span>
              <span className="text-green-600">
                Valid: <strong>{preview.valid.length}</strong>
              </span>
              <span className="text-red-600">
                Invalid: <strong>{preview.invalid.length}</strong>
              </span>
            </div>

            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.valid.map((entry) => {
                    const label =
                      resource === 'customers'
                        ? (entry.data.name as string)
                        : resource === 'vehicles'
                          ? (entry.data.registration_number as string)
                          : (entry.data.full_name as string)

                    return (
                      <TableRow key={`valid-${entry.row}`}>
                        <TableCell className="text-slate-500">{entry.row}</TableCell>
                        <TableCell>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </TableCell>
                        <TableCell className="text-sm">{label}</TableCell>
                      </TableRow>
                    )
                  })}
                  {preview.invalid.map((entry) => (
                    <TableRow key={`invalid-${entry.row}`}>
                      <TableCell className="text-slate-500">{entry.row}</TableCell>
                      <TableCell>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </TableCell>
                      <TableCell className="text-sm text-red-600">
                        {entry.errors.join('; ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>
                Back
              </Button>
              <Button
                type="button"
                disabled={preview.valid.length === 0 || isLoading}
                onClick={handleConfirm}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {preview.valid.length} {resource}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">
                Successfully imported {result.imported} of {result.total} rows.
              </p>
              {result.skipped > 0 && (
                <p className="mt-1 text-sm text-slate-600">
                  {result.skipped} rows skipped due to validation errors.
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700">
                    {result.errors.length} rows failed during import:
                  </p>
                  <ul className="mt-1 list-inside list-disc text-sm text-red-600">
                    {result.errors.map((e) => (
                      <li key={e.row}>
                        Row {e.row}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
