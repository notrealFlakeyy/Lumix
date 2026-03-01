export type LedgerLine = { debit: number; credit: number }

export function isBalanced(lines: LedgerLine[]) {
  const debit = round2(lines.reduce((sum, l) => sum + (l.debit || 0), 0))
  const credit = round2(lines.reduce((sum, l) => sum + (l.credit || 0), 0))
  return debit === credit
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

