export type AccountType = 'income' | 'expense'
export type PnlLine = { type: AccountType; debit: number; credit: number }

export function computePnL(lines: PnlLine[]) {
  const income = round2(lines.filter((l) => l.type === 'income').reduce((sum, l) => sum + (l.credit - l.debit), 0))
  const expense = round2(lines.filter((l) => l.type === 'expense').reduce((sum, l) => sum + (l.debit - l.credit), 0))
  const net = round2(income - expense)
  return { income, expense, net }
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

