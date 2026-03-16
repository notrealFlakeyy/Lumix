export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('fi-FI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('fi-FI', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatMinutes(minutes: number | string | null | undefined) {
  const value = Number(minutes ?? 0)
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return `${hours}h ${rest}m`
}

export function formatNumber(value: number | string | null | undefined, fractionDigits = 0) {
  const numeric = Number(value ?? 0)
  return new Intl.NumberFormat('fi-FI', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric)
}

export function formatTripStatus(status: string) {
  return status.replace(/_/g, ' ')
}
