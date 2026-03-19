'use client'

import * as React from 'react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { csvTemplateColumns, parseCsvHeaders, parseCsvRecords, type CsvRecord, type CsvTemplateResource } from '@/lib/utils/csv'

type ExistingRecord = {
  primary: string
  secondary?: string | null
  tertiary?: string | null
}

type BranchRecord = {
  code?: string | null
  name: string
}

type CsvImportAction = (formData: FormData) => void | Promise<void>

type ResourceConfig = {
  resource: CsvTemplateResource
  label: string
  description: string
  importLabel: string
  duplicateLabel: string
}

type PreviewState = {
  fileName: string
  rowCount: number
  headers: string[]
  previewRows: CsvRecord[]
  missingColumns: string[]
  duplicateMatches: Array<{ rowLabel: string; matchType: string; matchedValue: string }>
  invalidBranches: Array<{ rowLabel: string; branchValue: string }>
  hasFile: boolean
}

const resourceConfigs: ResourceConfig[] = [
  {
    resource: 'customers',
    label: 'Customers',
    description: 'Preview customer imports before creating or updating billing records.',
    importLabel: 'Import customers CSV',
    duplicateLabel: 'Matches existing customer by business ID or name',
  },
  {
    resource: 'vehicles',
    label: 'Vehicles',
    description: 'Use the preview to catch registration collisions before fleet updates land.',
    importLabel: 'Import vehicles CSV',
    duplicateLabel: 'Matches existing vehicle by registration number',
  },
  {
    resource: 'drivers',
    label: 'Drivers',
    description: 'Check email or full-name matches before linking field users to live driver records.',
    importLabel: 'Import drivers CSV',
    duplicateLabel: 'Matches existing driver by email or full name',
  },
]

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function getRowLabel(resource: CsvTemplateResource, row: CsvRecord) {
  if (resource === 'customers') return row.name || 'Unnamed customer'
  if (resource === 'vehicles') return row.registration_number || 'Unnamed vehicle'
  return row.full_name || 'Unnamed driver'
}

function getDuplicateMatches(resource: CsvTemplateResource, rows: CsvRecord[], existingRecords: ExistingRecord[]) {
  if (resource === 'customers') {
    return rows
      .map((row) => {
        const byBusinessId = existingRecords.find((record) => row.business_id && normalizeValue(record.secondary) === normalizeValue(row.business_id))
        if (byBusinessId) {
          return {
            rowLabel: getRowLabel(resource, row),
            matchType: 'business ID',
            matchedValue: row.business_id,
          }
        }

        const byName = existingRecords.find((record) => normalizeValue(record.primary) === normalizeValue(row.name))
        if (byName) {
          return {
            rowLabel: getRowLabel(resource, row),
            matchType: 'name',
            matchedValue: row.name,
          }
        }

        return null
      })
      .filter((value): value is { rowLabel: string; matchType: string; matchedValue: string } => Boolean(value))
  }

  if (resource === 'vehicles') {
    return rows
      .map((row) => {
        const match = existingRecords.find((record) => normalizeValue(record.primary) === normalizeValue(row.registration_number))
        if (!match) return null

        return {
          rowLabel: getRowLabel(resource, row),
          matchType: 'registration',
          matchedValue: row.registration_number,
        }
      })
      .filter((value): value is { rowLabel: string; matchType: string; matchedValue: string } => Boolean(value))
  }

  return rows
    .map((row) => {
      const byEmail = existingRecords.find((record) => row.email && normalizeValue(record.secondary) === normalizeValue(row.email))
      if (byEmail) {
        return {
          rowLabel: getRowLabel(resource, row),
          matchType: 'email',
          matchedValue: row.email,
        }
      }

      const byName = existingRecords.find((record) => normalizeValue(record.primary) === normalizeValue(row.full_name))
      if (byName) {
        return {
          rowLabel: getRowLabel(resource, row),
          matchType: 'full name',
          matchedValue: row.full_name,
        }
      }

      return null
    })
    .filter((value): value is { rowLabel: string; matchType: string; matchedValue: string } => Boolean(value))
}

function getMissingColumns(resource: CsvTemplateResource, rows: CsvRecord[], fileHeaders: string[]) {
  const requiredColumns = resource === 'customers' ? ['name'] : resource === 'vehicles' ? ['registration_number'] : ['full_name']
  return requiredColumns.filter((column) => !fileHeaders.includes(column))
}

function getInvalidBranchMatches(rows: CsvRecord[], availableBranches: BranchRecord[]) {
  const branchKeys = new Set(
    availableBranches
      .flatMap((branch) => [normalizeValue(branch.code), normalizeValue(branch.name)])
      .filter((value) => value.length > 0),
  )

  return rows
    .map((row) => {
      const rawBranch = row.branch_code || row.branch_name || ''
      if (!rawBranch) return null
      if (branchKeys.has(normalizeValue(rawBranch))) return null

      return {
        rowLabel: row.name || row.registration_number || row.full_name || 'Unnamed row',
        branchValue: rawBranch,
      }
    })
    .filter((value): value is { rowLabel: string; branchValue: string } => Boolean(value))
}

function emptyPreviewState(): PreviewState {
  return {
    fileName: '',
    rowCount: 0,
    headers: [],
    previewRows: [],
    missingColumns: [],
    duplicateMatches: [],
    invalidBranches: [],
    hasFile: false,
  }
}

export function CsvOnboardingPanel({
  customerAction,
  vehicleAction,
  driverAction,
  existingCustomers,
  existingVehicles,
  existingDrivers,
  availableBranches,
}: {
  customerAction: CsvImportAction
  vehicleAction: CsvImportAction
  driverAction: CsvImportAction
  existingCustomers: ExistingRecord[]
  existingVehicles: ExistingRecord[]
  existingDrivers: ExistingRecord[]
  availableBranches: BranchRecord[]
}) {
  const [previews, setPreviews] = React.useState<Record<CsvTemplateResource, PreviewState>>({
    customers: emptyPreviewState(),
    vehicles: emptyPreviewState(),
    drivers: emptyPreviewState(),
  })

  const actions: Record<CsvTemplateResource, CsvImportAction> = {
    customers: customerAction,
    vehicles: vehicleAction,
    drivers: driverAction,
  }

  const existingRecordMap: Record<CsvTemplateResource, ExistingRecord[]> = {
    customers: existingCustomers,
    vehicles: existingVehicles,
    drivers: existingDrivers,
  }

  async function handleFileChange(resource: CsvTemplateResource, file: File | null) {
    if (!file) {
      setPreviews((current) => ({ ...current, [resource]: emptyPreviewState() }))
      return
    }

    const content = await file.text()
    const rows = parseCsvRecords(content)
    const headers = parseCsvHeaders(content)
    const duplicateMatches = getDuplicateMatches(resource, rows, existingRecordMap[resource])
    const invalidBranches = getInvalidBranchMatches(rows, availableBranches)

    setPreviews((current) => ({
      ...current,
      [resource]: {
        fileName: file.name,
        rowCount: rows.length,
        headers,
        previewRows: rows.slice(0, 5),
        missingColumns: getMissingColumns(resource, rows, headers),
        duplicateMatches,
        invalidBranches,
        hasFile: true,
      },
    }))
  }

  return (
    <Card >
      <CardHeader>
        <CardTitle>CSV Import & Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            { resource: 'customers', label: 'Customers' },
            { resource: 'vehicles', label: 'Vehicles' },
            { resource: 'drivers', label: 'Drivers' },
            { resource: 'invoices', label: 'Invoices' },
          ].map((item) => (
            <div key={item.resource} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">{item.label}</div>
              <p className="mt-2 text-sm text-slate-600">Download the current dataset as a CSV export for onboarding, cleanup, or handoff.</p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/api/exports/${item.resource}`}>Export</Link>
                </Button>
                {item.resource !== 'invoices' ? (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/api/templates/${item.resource}`}>Template</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {resourceConfigs.map((config) => {
            const preview = previews[config.resource]
            const expectedColumns = csvTemplateColumns[config.resource]

            return (
              <form key={config.resource} action={actions[config.resource]} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${config.resource}_csv`}>Import {config.label}</Label>
                    <p className="mt-1 text-xs text-slate-500">{config.description}</p>
                  </div>

                  <Input
                    id={`${config.resource}_csv`}
                    name="file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      void handleFileChange(config.resource, event.target.files?.[0] ?? null)
                    }}
                  />

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                    <div className="font-medium text-slate-900">Expected columns</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {expectedColumns.map((column) => (
                        <Badge key={column} variant="default">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {preview.hasFile ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{preview.fileName}</div>
                          <div className="text-xs text-slate-500">{preview.rowCount} rows detected</div>
                        </div>
                        <Badge variant={preview.missingColumns.length === 0 && preview.invalidBranches.length === 0 ? 'success' : 'warning'}>
                          {preview.missingColumns.length === 0 && preview.invalidBranches.length === 0 ? 'Preview ready' : 'Needs review'}
                        </Badge>
                      </div>

                      {preview.missingColumns.length > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Missing required columns: {preview.missingColumns.join(', ')}
                        </div>
                      ) : null}

                      {preview.invalidBranches.length > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Unknown branch references: {preview.invalidBranches.slice(0, 3).map((item) => `${item.rowLabel} (${item.branchValue})`).join(', ')}
                          {preview.invalidBranches.length > 3 ? ' and more.' : ''}
                        </div>
                      ) : null}

                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="font-medium text-slate-900">Duplicate signals</div>
                        {preview.duplicateMatches.length > 0 ? (
                          <div className="space-y-1">
                            <div>{preview.duplicateMatches.length} rows will likely update existing data.</div>
                            {preview.duplicateMatches.slice(0, 3).map((match) => (
                              <div key={`${match.rowLabel}-${match.matchType}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                {match.rowLabel} matches by {match.matchType}: {match.matchedValue}
                              </div>
                            ))}
                            {preview.duplicateMatches.length > 3 ? <div>Additional matches hidden for brevity.</div> : null}
                          </div>
                        ) : (
                          <div>No likely updates detected from the selected file.</div>
                        )}
                      </div>

                      {preview.previewRows.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-slate-900">Preview rows</div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {expectedColumns.slice(0, 4).map((column) => (
                                    <TableHead key={column}>{column}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {preview.previewRows.map((row, index) => (
                                  <TableRow key={`${config.resource}-preview-${index}`}>
                                    {expectedColumns.slice(0, 4).map((column) => (
                                      <TableCell key={column}>{row[column] || '-'}</TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">No rows parsed from the selected file.</div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-xs text-slate-500">
                      Select a CSV file to preview row count, sample values, and likely updates before import.
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                    {config.duplicateLabel}. Imports still validate every row server-side before changes are committed.
                  </div>
                </div>

                <Button type="submit" variant="outline" className="mt-4 w-full" disabled={!preview.hasFile || preview.missingColumns.length > 0 || preview.invalidBranches.length > 0}>
                  {config.importLabel}
                </Button>
              </form>
            )
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <div className="font-medium text-slate-900">Import behavior</div>
          <div className="mt-2 space-y-2">
            <p>Customer imports update existing rows by business ID first, then by exact customer name.</p>
            <p>Vehicle imports update rows by registration number. Driver imports update by email first, then by exact full name.</p>
            <p>Use `branch_code` whenever the company has more than one active branch. Branch names are accepted as a fallback, but branch codes are safer for repeatable imports and exports.</p>
            <p>Invoices are export-only in this pass to avoid importing financial rows without stronger reconciliation controls.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
