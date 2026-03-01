import { describe, expect, it } from 'vitest'

import { parseBankCsv } from './csv'

describe('banking.parseBankCsv', () => {
  it('parses semicolon CSV with Finnish date', () => {
    const rows = parseBankCsv('Päiväys;Summa;Viite\n25.02.2026;124,00;12345\n')
    expect(rows).toHaveLength(1)
    expect(rows[0].bookingDate).toBe('2026-02-25')
    expect(rows[0].amount).toBe(124)
    expect(rows[0].referenceNumber).toBe('12345')
  })
})

