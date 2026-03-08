export type CsvRecord = Record<string, string>
export type CsvTemplateResource = 'customers' | 'vehicles' | 'drivers'

export const csvTemplateColumns: Record<CsvTemplateResource, string[]> = {
  customers: [
    'name',
    'business_id',
    'vat_number',
    'email',
    'phone',
    'billing_address_line1',
    'billing_address_line2',
    'billing_postal_code',
    'billing_city',
    'billing_country',
    'notes',
  ],
  vehicles: ['registration_number', 'make', 'model', 'year', 'fuel_type', 'current_km', 'next_service_km', 'is_active'],
  drivers: ['full_name', 'email', 'phone', 'license_type', 'employment_type', 'is_active'],
}

const csvTemplateRows: Record<CsvTemplateResource, Array<Record<string, string>>> = {
  customers: [
    {
      name: 'North Harbor Timber',
      business_id: '3012345-6',
      vat_number: 'FI30123456',
      email: 'dispatch@northharbor.fi',
      phone: '+358401234560',
      billing_address_line1: 'Satamakatu 4',
      billing_address_line2: '',
      billing_postal_code: '20100',
      billing_city: 'Turku',
      billing_country: 'FI',
      notes: 'Preferred morning pickup window.',
    },
  ],
  vehicles: [
    {
      registration_number: 'JKL-321',
      make: 'Volvo',
      model: 'FH',
      year: '2023',
      fuel_type: 'Diesel',
      current_km: '124500',
      next_service_km: '145000',
      is_active: 'true',
    },
  ],
  drivers: [
    {
      full_name: 'Laura Miettinen',
      email: 'laura.miettinen@example.com',
      phone: '+358401234561',
      license_type: 'CE',
      employment_type: 'Full-time',
      is_active: 'true',
    },
  ],
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function detectDelimiter(value: string) {
  const firstLine = normalizeLineEndings(value).split('\n').find((line) => line.trim().length > 0) ?? ''
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const semicolonCount = (firstLine.match(/;/g) ?? []).length
  return semicolonCount > commaCount ? ';' : ','
}

export function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function parseCsvRows(value: string, delimiter = detectDelimiter(value)) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ''
  let inQuotes = false
  const input = normalizeLineEndings(value)

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if (!inQuotes && char === '\n') {
      currentRow.push(currentValue)
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += char
  }

  currentRow.push(currentValue)
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

export function parseCsvHeaders(value: string) {
  const rows = parseCsvRows(value)
  if (rows.length === 0) {
    return []
  }

  return rows[0].map(normalizeCsvHeader).filter((header) => header.length > 0)
}

export function parseCsvRecords(value: string) {
  const rows = parseCsvRows(value)
  if (rows.length === 0) {
    return []
  }

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map(normalizeCsvHeader)

  return dataRows
    .map((row) =>
      headers.reduce<CsvRecord>((record, header, index) => {
        record[header] = row[index]?.trim() ?? ''
        return record
      }, {}),
    )
    .filter((record) => Object.values(record).some((value) => value.length > 0))
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value)
  if (/[",\n;]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }

  return normalized
}

export function stringifyCsvRows(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const lines = [headers.map(escapeCsvValue).join(',')]

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(','))
  }

  return lines.join('\n')
}

export function getCsvTemplateRows(resource: CsvTemplateResource) {
  return csvTemplateRows[resource]
}

export function getCsvTemplateCsv(resource: CsvTemplateResource) {
  return stringifyCsvRows(getCsvTemplateRows(resource))
}
