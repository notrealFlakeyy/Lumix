import { describe, it, expect } from 'vitest'
import {
  estimateTripProfitability,
  getEstimatedDrivingHours,
  type ProfitabilityAssumptions,
  type TripProfitabilityInput,
} from '@/lib/utils/profitability'

const defaultAssumptions: ProfitabilityAssumptions = {
  fuelCostPerKm: 0.35,
  maintenanceCostPerKm: 0.08,
  driverCostPerHour: 28,
  waitingCostPerHour: 20,
}

// ---------------------------------------------------------------------------
// estimateTripProfitability
// ---------------------------------------------------------------------------
describe('estimateTripProfitability', () => {
  it('calculates a basic trip with distance only', () => {
    const input: TripProfitabilityInput = {
      revenue: 500,
      distanceKm: 200,
      waitingTimeMinutes: 0,
      startTime: null,
      endTime: null,
    }
    const result = estimateTripProfitability(input, defaultAssumptions)

    expect(result.revenue).toBe(500)
    expect(result.distanceKm).toBe(200)
    // fuel: 200*0.35=70, maintenance: 200*0.08=16, driver: (200/65)*28
    const expectedDrivingHours = 200 / 65
    const expectedCost = 70 + 16 + expectedDrivingHours * 28
    expect(result.estimatedCost).toBe(Number(expectedCost.toFixed(2)))
    expect(result.estimatedMargin).toBe(Number((500 - expectedCost).toFixed(2)))
  })

  it('adds waiting cost when waiting time is provided', () => {
    const input: TripProfitabilityInput = {
      revenue: 500,
      distanceKm: 100,
      waitingTimeMinutes: 60,
      startTime: null,
      endTime: null,
    }
    const result = estimateTripProfitability(input, defaultAssumptions)

    expect(result.waitingHours).toBe(1)
    // waiting cost: 1 * 20 = 20
    const drivingHours = 100 / 65
    const expectedCost = 100 * 0.35 + 100 * 0.08 + drivingHours * 28 + 20
    expect(result.estimatedCost).toBe(Number(expectedCost.toFixed(2)))
  })

  it('returns zero costs for zero distance trip', () => {
    const input: TripProfitabilityInput = {
      revenue: 100,
      distanceKm: 0,
      waitingTimeMinutes: 0,
      startTime: null,
      endTime: null,
    }
    const result = estimateTripProfitability(input, defaultAssumptions)

    expect(result.distanceKm).toBe(0)
    expect(result.estimatedCost).toBe(0)
    expect(result.estimatedMargin).toBe(100)
  })

  it('returns correct margin percentage', () => {
    const input: TripProfitabilityInput = {
      revenue: 1000,
      distanceKm: 0,
      waitingTimeMinutes: 0,
      startTime: null,
      endTime: null,
    }
    const result = estimateTripProfitability(input, defaultAssumptions)

    expect(result.marginPercent).toBe(100)
  })

  it('returns null margin percentage when revenue is zero', () => {
    const input: TripProfitabilityInput = {
      revenue: 0,
      distanceKm: 100,
      waitingTimeMinutes: 0,
      startTime: null,
      endTime: null,
    }
    const result = estimateTripProfitability(input, defaultAssumptions)

    expect(result.marginPercent).toBeNull()
  })

  it('calculates all cost components correctly', () => {
    const input: TripProfitabilityInput = {
      revenue: 800,
      distanceKm: 300,
      waitingTimeMinutes: 120,
      startTime: null,
      endTime: null,
    }
    const result = estimateTripProfitability(input, defaultAssumptions)

    const drivingHours = 300 / 65
    const fuelCost = 300 * 0.35
    const maintenanceCost = 300 * 0.08
    const driverCost = drivingHours * 28
    const waitingCost = 2 * 20
    const totalCost = fuelCost + maintenanceCost + driverCost + waitingCost

    expect(result.estimatedCost).toBe(Number(totalCost.toFixed(2)))
    expect(result.waitingHours).toBe(2)
    expect(result.drivingHours).toBe(Number(drivingHours.toFixed(2)))
  })
})

// ---------------------------------------------------------------------------
// getEstimatedDrivingHours
// ---------------------------------------------------------------------------
describe('getEstimatedDrivingHours', () => {
  it('uses actual start and end times when provided', () => {
    const result = getEstimatedDrivingHours({
      distanceKm: 100,
      startTime: '2024-06-01T08:00:00Z',
      endTime: '2024-06-01T10:30:00Z',
    })
    expect(result).toBe(2.5)
  })

  it('falls back to distance estimate at 65 km/h', () => {
    const result = getEstimatedDrivingHours({
      distanceKm: 130,
      startTime: null,
      endTime: null,
    })
    expect(result).toBe(2) // 130 / 65
  })

  it('returns 0 when neither times nor distance available', () => {
    const result = getEstimatedDrivingHours({
      distanceKm: null,
      startTime: null,
      endTime: null,
    })
    expect(result).toBe(0)
  })

  it('returns 0 when distance is zero and no times', () => {
    const result = getEstimatedDrivingHours({
      distanceKm: 0,
      startTime: null,
      endTime: null,
    })
    expect(result).toBe(0)
  })

  it('prefers actual times over distance estimate', () => {
    const result = getEstimatedDrivingHours({
      distanceKm: 1000, // would be ~15.38 hours
      startTime: '2024-06-01T08:00:00Z',
      endTime: '2024-06-01T09:00:00Z',
    })
    expect(result).toBe(1) // uses actual 1 hour, not distance-based
  })
})
