export type BankTransaction = {
  bookingDate: string
  amount: number
  currency: 'EUR'
  counterpartyName?: string
  referenceNumber?: string
  message?: string
}

export interface BankStatementImporter {
  parseCsv(csvText: string): BankTransaction[]
}

export class MockBankStatementImporter implements BankStatementImporter {
  parseCsv(): BankTransaction[] {
    return []
  }
}

