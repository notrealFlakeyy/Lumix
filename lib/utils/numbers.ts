export function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toDisplayNumber(value: number | string | null | undefined, digits = 0) {
  return toNumber(value).toLocaleString('en-FI', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
