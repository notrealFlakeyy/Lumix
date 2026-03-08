import { toNumber } from '@/lib/utils/numbers'

export type ProfitabilityAssumptions = {
  fuelCostPerKm: number
  maintenanceCostPerKm: number
  driverCostPerHour: number
  waitingCostPerHour: number
}

export type TripProfitabilityInput = {
  revenue: number
  distanceKm: number | string | null | undefined
  waitingTimeMinutes: number | null | undefined
  startTime: string | null | undefined
  endTime: string | null | undefined
}

export function getEstimatedDrivingHours(input: Pick<TripProfitabilityInput, 'distanceKm' | 'startTime' | 'endTime'>) {
  if (input.startTime && input.endTime) {
    const diffMs = new Date(input.endTime).getTime() - new Date(input.startTime).getTime()
    if (Number.isFinite(diffMs) && diffMs > 0) {
      return diffMs / (1000 * 60 * 60)
    }
  }

  const distanceKm = toNumber(input.distanceKm)
  return distanceKm > 0 ? distanceKm / 65 : 0
}

export function estimateTripProfitability(input: TripProfitabilityInput, assumptions: ProfitabilityAssumptions) {
  const revenue = toNumber(input.revenue)
  const distanceKm = toNumber(input.distanceKm)
  const waitingHours = Math.max(0, (input.waitingTimeMinutes ?? 0) / 60)
  const drivingHours = getEstimatedDrivingHours(input)
  const fuelCost = distanceKm * assumptions.fuelCostPerKm
  const maintenanceCost = distanceKm * assumptions.maintenanceCostPerKm
  const driverTimeCost = drivingHours * assumptions.driverCostPerHour
  const waitingCost = waitingHours * assumptions.waitingCostPerHour
  const estimatedCost = Number((fuelCost + maintenanceCost + driverTimeCost + waitingCost).toFixed(2))
  const estimatedMargin = Number((revenue - estimatedCost).toFixed(2))

  return {
    revenue,
    distanceKm,
    drivingHours: Number(drivingHours.toFixed(2)),
    waitingHours: Number(waitingHours.toFixed(2)),
    estimatedCost,
    estimatedMargin,
    marginPercent: revenue > 0 ? Number(((estimatedMargin / revenue) * 100).toFixed(1)) : null,
  }
}
