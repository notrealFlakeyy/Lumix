import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { canManageSettings } from '@/lib/auth/permissions'
import { createCustomer } from '@/lib/db/mutations/customers'
import { createDriver } from '@/lib/db/mutations/drivers'
import { createVehicle } from '@/lib/db/mutations/vehicles'
import { parseCsvRecords, type CsvTemplateResource } from '@/lib/utils/csv'
import { customerSchema } from '@/lib/validations/customer'
import { driverSchema } from '@/lib/validations/driver'
import { vehicleSchema } from '@/lib/validations/vehicle'
import type { ZodSchema } from 'zod'

type ImportResource = CsvTemplateResource

function isImportResource(value: string): value is ImportResource {
  return value === 'customers' || value === 'vehicles' || value === 'drivers'
}

const schemas: Record<ImportResource, ZodSchema> = {
  customers: customerSchema,
  vehicles: vehicleSchema,
  drivers: driverSchema,
}

function resolveBranchId(
  branchCode: string | undefined,
  branchMap: Map<string, string>,
): string | undefined {
  if (!branchCode) return undefined
  return branchMap.get(branchCode.trim().toUpperCase())
}

function preprocessRecord(
  resource: ImportResource,
  record: Record<string, string>,
  branchMap: Map<string, string>,
) {
  const branchId = resolveBranchId(record.branch_code, branchMap)

  if (resource === 'customers') {
    return {
      branch_id: branchId,
      name: record.name,
      email: record.email,
      business_id: record.business_id,
      vat_number: record.vat_number,
      phone: record.phone,
      billing_address_line1: record.billing_address_line1,
      billing_address_line2: record.billing_address_line2,
      billing_postal_code: record.billing_postal_code,
      billing_city: record.billing_city,
      billing_country: record.billing_country,
      notes: record.notes,
    }
  }

  if (resource === 'vehicles') {
    return {
      branch_id: branchId,
      registration_number: record.registration_number,
      make: record.make,
      model: record.model,
      year: record.year,
      fuel_type: record.fuel_type,
      current_km: record.current_km,
      next_service_km: record.next_service_km,
      is_active: record.is_active?.toLowerCase() === 'false' ? false : true,
    }
  }

  // drivers
  return {
    branch_id: branchId,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone,
    license_type: record.license_type,
    employment_type: record.employment_type,
    is_active: record.is_active?.toLowerCase() === 'false' ? false : true,
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params
  if (!isImportResource(resource)) {
    return Response.json({ error: 'Unsupported import resource.' }, { status: 404 })
  }

  const { supabase, membership, user } = await getCurrentMembership()
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!membership?.company_id || !canManageSettings(membership.role)) {
    return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  const companyId = membership.company_id
  const confirm = new URL(request.url).searchParams.get('confirm') === 'true'

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'CSV file is required.' }, { status: 400 })
  }

  const csvText = await file.text()
  const records = parseCsvRecords(csvText)

  if (records.length === 0) {
    return Response.json({ error: 'No data rows found in CSV.' }, { status: 400 })
  }

  // Build branch code -> id map
  const { data: branches } = await supabase
    .from('branches')
    .select('id, code')
    .eq('company_id', companyId)
  const branchMap = new Map(
    (branches ?? []).map((row) => [row.code.toUpperCase(), row.id]),
  )

  const schema = schemas[resource]
  const valid: Array<{ row: number; data: Record<string, unknown> }> = []
  const invalid: Array<{ row: number; errors: string[] }> = []

  for (let i = 0; i < records.length; i++) {
    const preprocessed = preprocessRecord(resource, records[i], branchMap)
    const result = schema.safeParse(preprocessed)

    if (result.success) {
      valid.push({ row: i + 1, data: result.data })
    } else {
      invalid.push({
        row: i + 1,
        errors: result.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        ),
      })
    }
  }

  if (!confirm) {
    return Response.json({
      valid: valid.map((v) => ({ row: v.row, data: v.data })),
      invalid,
      total: records.length,
    })
  }

  // Actually import
  const membershipAccess = {
    branchIds: membership.branchIds,
    hasRestrictedBranchAccess: membership.branchIds.length > 0,
  }

  let imported = 0
  const importErrors: Array<{ row: number; error: string }> = []

  for (const entry of valid) {
    try {
      if (resource === 'customers') {
        await createCustomer(companyId, user.id, entry.data as any, membershipAccess)
      } else if (resource === 'vehicles') {
        await createVehicle(companyId, user.id, entry.data as any, membershipAccess)
      } else {
        await createDriver(companyId, user.id, entry.data as any, membershipAccess)
      }
      imported += 1
    } catch (err) {
      importErrors.push({
        row: entry.row,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return Response.json({
    imported,
    skipped: invalid.length,
    errors: importErrors,
    total: records.length,
  })
}
