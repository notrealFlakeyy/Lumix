import { toNumber } from '@/lib/utils/numbers'

export function calculateWorkedMinutes(startTime: string, endTime: string, breakMinutes = 0) {
  const totalMinutes = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
  return Math.max(totalMinutes - breakMinutes, 0)
}

export function splitRegularAndOvertime(totalMinutes: number, regularDayCap = 8 * 60) {
  const regularMinutes = Math.min(totalMinutes, regularDayCap)
  const overtimeMinutes = Math.max(totalMinutes - regularDayCap, 0)
  return {
    regularMinutes,
    overtimeMinutes,
  }
}

export function formatMinutesAsHours(totalMinutes: number) {
  return `${(totalMinutes / 60).toFixed(1)} h`
}

export function calculateEstimatedGrossPay({
  regularMinutes,
  overtimeMinutes,
  hourlyRate,
  overtimeRate,
}: {
  regularMinutes: number
  overtimeMinutes: number
  hourlyRate: number | string
  overtimeRate: number | string | null | undefined
}) {
  const regularRate = toNumber(hourlyRate)
  const overtimeRateValue = overtimeRate == null ? regularRate * 1.5 : toNumber(overtimeRate)
  return (regularMinutes / 60) * regularRate + (overtimeMinutes / 60) * overtimeRateValue
}
