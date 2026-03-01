export type ParsedBankRow = {
  bookingDate: string
  amount: number
  currency: 'EUR'
  counterpartyName?: string
  referenceNumber?: string
  message?: string
  raw: Record<string, string>
}

// Minimal CSV parser for MVP: supports comma/semicolon, quoted values.
export function parseBankCsv(text: string): ParsedBankRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const delimiter = guessDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.trim())

  const rows: ParsedBankRow[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line, delimiter)
    const raw: Record<string, string> = {}
    headers.forEach((h, i) => {
      raw[h] = cols[i] ?? ''
    })

    const bookingDate = pickFirst(raw, ['booking_date', 'date', 'Päiväys', 'Kirjauspäivä', 'Datum']) ?? ''
    const amountStr = pickFirst(raw, ['amount', 'Summa', 'Belopp', 'Amount']) ?? ''
    const referenceNumber =
      pickFirst(raw, ['reference', 'reference_number', 'Viite', 'Viitenumero', 'Referens', 'Reference']) ?? undefined
    const message = pickFirst(raw, ['message', 'Viesti', 'Meddelande', 'Message']) ?? undefined
    const counterpartyName = pickFirst(raw, ['name', 'Vastapuoli', 'Mottagare', 'Counterparty']) ?? undefined

    const amount = parseAmount(amountStr)
    if (!bookingDate || !Number.isFinite(amount)) continue

    rows.push({
      bookingDate: normalizeDate(bookingDate),
      amount,
      currency: 'EUR',
      counterpartyName,
      referenceNumber,
      message,
      raw,
    })
  }

  return rows
}

function guessDelimiter(headerLine: string) {
  const commas = (headerLine.match(/,/g) ?? []).length
  const semis = (headerLine.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && ch === delimiter) {
      result.push(current)
      current = ''
      continue
    }
    current += ch
  }
  result.push(current)
  return result
}

function pickFirst(raw: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (raw[key] != null && raw[key].trim() !== '') return raw[key].trim()
  }
  return undefined
}

function parseAmount(input: string) {
  const cleaned = input.replace(/\s/g, '').replace(',', '.')
  const value = Number(cleaned)
  return value
}

function normalizeDate(input: string) {
  // Accept YYYY-MM-DD or DD.MM.YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const m = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    return `${m[3]}-${mm}-${dd}`
  }
  return input
}

