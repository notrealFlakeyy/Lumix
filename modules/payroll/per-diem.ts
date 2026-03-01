export type PerDiemConfig = {
  fullDayEur: number
  partialDayEur: number
}

export function calculatePerDiem(config: PerDiemConfig, hoursAway: number) {
  if (hoursAway >= 10) return config.fullDayEur
  if (hoursAway >= 6) return config.partialDayEur
  return 0
}

