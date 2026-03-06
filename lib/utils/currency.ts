const moneyFormatter = new Intl.NumberFormat('en-FI', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number) {
  return moneyFormatter.format(value)
}
