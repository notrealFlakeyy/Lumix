import { describe, it, expect } from 'vitest'
import { parseCsvRecords, stringifyCsvRows } from '@/lib/utils/csv'

// ---------------------------------------------------------------------------
// parseCsvRecords
// ---------------------------------------------------------------------------
describe('parseCsvRecords', () => {
  it('parses simple CSV with headers', () => {
    const csv = 'name,age,city\nAlice,30,Helsinki\nBob,25,Turku'
    const records = parseCsvRecords(csv)
    expect(records).toHaveLength(2)
    expect(records[0]).toEqual({ name: 'Alice', age: '30', city: 'Helsinki' })
    expect(records[1]).toEqual({ name: 'Bob', age: '25', city: 'Turku' })
  })

  it('handles quoted fields containing commas', () => {
    const csv = 'name,address\n"Smith, John","123 Main St, Apt 4"'
    const records = parseCsvRecords(csv)
    expect(records).toHaveLength(1)
    expect(records[0].name).toBe('Smith, John')
    expect(records[0].address).toBe('123 Main St, Apt 4')
  })

  it('handles empty fields', () => {
    const csv = 'name,email,phone\nAlice,,+358401234560'
    const records = parseCsvRecords(csv)
    expect(records).toHaveLength(1)
    expect(records[0].email).toBe('')
    expect(records[0].phone).toBe('+358401234560')
  })

  it('auto-detects semicolon delimiter', () => {
    const csv = 'name;age;city\nAlice;30;Helsinki'
    const records = parseCsvRecords(csv)
    expect(records).toHaveLength(1)
    expect(records[0]).toEqual({ name: 'Alice', age: '30', city: 'Helsinki' })
  })

  it('returns empty array for empty input', () => {
    const records = parseCsvRecords('')
    expect(records).toEqual([])
  })

  it('returns empty array for header-only CSV', () => {
    const records = parseCsvRecords('name,age,city')
    expect(records).toEqual([])
  })

  it('handles quoted fields with escaped quotes', () => {
    const csv = 'name,note\nAlice,"She said ""hello"""'
    const records = parseCsvRecords(csv)
    expect(records[0].note).toBe('She said "hello"')
  })
})

// ---------------------------------------------------------------------------
// stringifyCsvRows
// ---------------------------------------------------------------------------
describe('stringifyCsvRows', () => {
  it('outputs basic data with headers', () => {
    const rows = [
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]
    const csv = stringifyCsvRows(rows)
    expect(csv).toBe('name,age\nAlice,30\nBob,25')
  })

  it('quotes fields that contain commas', () => {
    const rows = [{ name: 'Smith, John', city: 'Helsinki' }]
    const csv = stringifyCsvRows(rows)
    expect(csv).toBe('name,city\n"Smith, John",Helsinki')
  })

  it('escapes quotes within fields', () => {
    const rows = [{ note: 'She said "hello"' }]
    const csv = stringifyCsvRows(rows)
    expect(csv).toBe('note\n"She said ""hello"""')
  })

  it('returns empty string for empty array', () => {
    const csv = stringifyCsvRows([])
    expect(csv).toBe('')
  })

  it('handles null and undefined values', () => {
    const rows = [{ name: 'Alice', note: null, extra: undefined }]
    const csv = stringifyCsvRows(rows)
    expect(csv).toBe('name,note,extra\nAlice,,')
  })
})
