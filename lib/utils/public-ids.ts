export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function getDriverRouteId(driver: { id: string; public_id?: string | null }) {
  return driver.public_id ?? driver.id
}

export function getTripRouteId(trip: { id: string; public_id?: string | null }) {
  return trip.public_id ?? trip.id
}

export function getTripDisplayId(trip: { id: string; public_id?: string | null }) {
  return getTripRouteId(trip)
}
