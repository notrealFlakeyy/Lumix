import 'server-only'

import type { TableRow } from '@/types/database'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'

export type TripCheckpointInput = {
  checkpoint_type: 'arrived_pickup' | 'departed_pickup' | 'arrived_delivery' | 'delivered'
  latitude: number
  longitude: number
  accuracy_meters?: number | null
  notes?: string | null
}

export async function captureTripCheckpoint(
  companyId: string,
  userId: string,
  tripId: string,
  input: TripCheckpointInput,
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, branch_id, driver_id')
    .eq('company_id', companyId)
    .eq('id', tripId)
    .maybeSingle()

  if (tripError) {
    throw tripError
  }
  if (!trip) {
    throw new Error('Trip not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, trip.branch_id, 'trip checkpoint')
  }

  const { data, error } = await supabase
    .from('trip_checkpoints')
    .insert({
      company_id: companyId,
      branch_id: trip.branch_id,
      trip_id: tripId,
      checkpoint_type: input.checkpoint_type,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_meters: input.accuracy_meters ?? null,
      notes: input.notes ?? null,
      captured_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const checkpoint = data as TableRow<'trip_checkpoints'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip_checkpoint',
    entity_id: checkpoint.id,
    action: input.checkpoint_type,
    new_values: checkpoint,
  })

  return checkpoint
}
