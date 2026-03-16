import 'server-only'

import type { TableRow } from '@/types/database'
import type { TripInput } from '@/lib/validations/trip'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'

export async function createTrip(companyId: string, userId: string, input: TripInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  let branchId = input.branch_id ?? null
  if (input.transport_order_id) {
    const { data: linkedOrder } = await supabase
      .from('transport_orders')
      .select('branch_id')
      .eq('company_id', companyId)
      .eq('id', input.transport_order_id)
      .maybeSingle()

    if (linkedOrder?.branch_id) {
      if (branchId && branchId !== linkedOrder.branch_id) {
        throw new Error('The selected trip branch must match the linked order branch.')
      }
      branchId = linkedOrder.branch_id
    }
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, branchId, 'trip')
  }
  const { data, error } = await supabase
    .from('trips')
    .insert({
      company_id: companyId,
      created_by: userId,
      ...input,
      branch_id: branchId,
    })
    .select('*')
    .single()

  if (error) throw error

  const trip = data as TableRow<'trips'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip',
    entity_id: trip.id,
    action: 'create',
    new_values: trip,
  })

  return trip
}

export async function updateTrip(companyId: string, userId: string, id: string, input: TripInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  let branchId = input.branch_id ?? null
  if (input.transport_order_id) {
    const { data: linkedOrder } = await supabase
      .from('transport_orders')
      .select('branch_id')
      .eq('company_id', companyId)
      .eq('id', input.transport_order_id)
      .maybeSingle()

    if (linkedOrder?.branch_id) {
      if (branchId && branchId !== linkedOrder.branch_id) {
        throw new Error('The selected trip branch must match the linked order branch.')
      }
      branchId = linkedOrder.branch_id
    }
  }
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, branchId, 'trip')
  }
  const { data: previous } = await supabase.from('trips').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  const { data, error } = await supabase
    .from('trips')
    .update({
      ...input,
      branch_id: branchId,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const trip = data as TableRow<'trips'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip',
    entity_id: id,
    action: 'update',
    old_values: previous,
    new_values: trip,
  })

  return trip
}

export async function createTripFromOrder(companyId: string, userId: string, orderId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: order, error } = await supabase
    .from('transport_orders')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', orderId)
    .single()

  if (error) throw error
  const typedOrder = order as TableRow<'transport_orders'>
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, typedOrder.branch_id, 'trip')
  }

  const { data: existingTrip } = await supabase
    .from('trips')
    .select('id, public_id')
    .eq('company_id', companyId)
    .eq('transport_order_id', orderId)
    .limit(1)
    .maybeSingle()

  if (existingTrip) return existingTrip

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      company_id: companyId,
      created_by: userId,
      branch_id: typedOrder.branch_id,
      transport_order_id: typedOrder.id,
      customer_id: typedOrder.customer_id,
      vehicle_id: typedOrder.assigned_vehicle_id,
      driver_id: typedOrder.assigned_driver_id,
      start_time: typedOrder.scheduled_at,
      status: 'planned',
      notes: typedOrder.notes,
    })
    .select('*')
    .single()

  if (tripError) throw tripError

  await supabase.from('transport_orders').update({ status: typedOrder.status === 'draft' ? 'assigned' : typedOrder.status }).eq('company_id', companyId).eq('id', typedOrder.id)

  const createdTrip = trip as TableRow<'trips'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip',
    entity_id: createdTrip.id,
    action: 'create_from_order',
    new_values: createdTrip,
  })

  return createdTrip
}

export async function startTrip(
  companyId: string,
  userId: string,
  id: string,
  input?: {
    start_km?: number | string | null
    notes?: string | null
    start_time?: string | null
  },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const now = input?.start_time ?? new Date().toISOString()
  const { data: currentTrip, error: currentTripError } = await supabase.from('trips').select('*').eq('company_id', companyId).eq('id', id).single()

  if (currentTripError) throw currentTripError
  const previousTrip = currentTrip as TableRow<'trips'>
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, previousTrip.branch_id, 'trip')
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'started',
      start_time: now,
      start_km: input?.start_km ?? previousTrip.start_km,
      notes: input?.notes ?? previousTrip.notes,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  const trip = data as TableRow<'trips'>

  if (trip.transport_order_id) {
    await supabase
      .from('transport_orders')
      .update({ status: 'in_progress' })
      .eq('company_id', companyId)
      .eq('id', trip.transport_order_id)
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip',
    entity_id: id,
    action: 'start',
    old_values: previousTrip,
    new_values: trip,
  })

  return trip
}

export async function completeTrip(
  companyId: string,
  userId: string,
  id: string,
  input?: {
    end_km?: number | string | null
    waiting_time_minutes?: number
    notes?: string | null
    delivery_confirmation?: string | null
    end_time?: string | null
  },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const { data: trip, error: tripError } = await supabase.from('trips').select('*').eq('company_id', companyId).eq('id', id).single()
  if (tripError) throw tripError
  const currentTrip = trip as TableRow<'trips'>
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, currentTrip.branch_id, 'trip')
  }

  const endKm = input?.end_km ?? currentTrip.end_km
  const waitingTime = input?.waiting_time_minutes ?? currentTrip.waiting_time_minutes
  const notes = input?.notes ?? currentTrip.notes
  const deliveryConfirmation = input?.delivery_confirmation ?? currentTrip.delivery_confirmation

  let distance = currentTrip.distance_km ? Number(currentTrip.distance_km) : null
  if (currentTrip.start_km !== null && endKm !== null) {
    distance = Number(endKm) - Number(currentTrip.start_km)
    if (distance < 0) {
      throw new Error('Trip distance cannot be negative.')
    }
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      end_time: input?.end_time ?? currentTrip.end_time ?? new Date().toISOString(),
      end_km: endKm,
      waiting_time_minutes: waitingTime,
      notes,
      delivery_confirmation: deliveryConfirmation,
      distance_km: distance,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  const completedTrip = data as TableRow<'trips'>

  if (completedTrip.transport_order_id) {
    await supabase
      .from('transport_orders')
      .update({ status: 'completed' })
      .eq('company_id', companyId)
      .eq('id', completedTrip.transport_order_id)
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip',
    entity_id: id,
    action: 'complete',
    old_values: currentTrip,
    new_values: completedTrip,
  })

  return completedTrip
}

export async function updateTripDeliveryProof(
  companyId: string,
  userId: string,
  id: string,
  input: {
    delivery_confirmation?: string | null
    delivery_recipient_name?: string | null
    delivery_received_at?: string | null
  },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const { data: trip, error: tripError } = await supabase.from('trips').select('*').eq('company_id', companyId).eq('id', id).single()
  if (tripError) throw tripError
  const currentTrip = trip as TableRow<'trips'>
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, currentTrip.branch_id, 'trip')
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      delivery_confirmation: input.delivery_confirmation ?? currentTrip.delivery_confirmation,
      delivery_recipient_name: input.delivery_recipient_name ?? currentTrip.delivery_recipient_name,
      delivery_received_at: input.delivery_received_at ?? currentTrip.delivery_received_at,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  const updatedTrip = data as TableRow<'trips'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'trip',
    entity_id: id,
    action: 'update_delivery_proof',
    old_values: currentTrip,
    new_values: updatedTrip,
  })

  return updatedTrip
}
