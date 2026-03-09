import 'server-only'

import type { TableRow } from '@/types/database'

import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { toNumber } from '@/lib/utils/numbers'

function mergeNullableText(primary: string | null, secondary: string | null) {
  return primary?.trim() ? primary : secondary?.trim() ? secondary : null
}

function mergeNotes(primary: string | null, secondary: string | null) {
  const first = primary?.trim()
  const second = secondary?.trim()

  if (first && second && first !== second) {
    return `${first}\n\nMerged duplicate note:\n${second}`
  }

  return first ?? second ?? null
}

export async function mergeCustomerDuplicate(companyId: string, userId: string, targetId: string, sourceId: string, client?: DbClient) {
  if (targetId === sourceId) {
    throw new Error('Source and target customers must be different.')
  }

  const supabase = await getDbClient(client)
  const [{ data: targetData }, { data: sourceData }] = await Promise.all([
    supabase.from('customers').select('*').eq('company_id', companyId).eq('id', targetId).single(),
    supabase.from('customers').select('*').eq('company_id', companyId).eq('id', sourceId).single(),
  ])
  const target = targetData as TableRow<'customers'> | null
  const source = sourceData as TableRow<'customers'> | null

  if (!target || !source) {
    throw new Error('Customer merge failed because one of the records no longer exists.')
  }

  await Promise.all([
    supabase.from('transport_orders').update({ customer_id: targetId }).eq('company_id', companyId).eq('customer_id', sourceId),
    supabase.from('trips').update({ customer_id: targetId }).eq('company_id', companyId).eq('customer_id', sourceId),
    supabase.from('invoices').update({ customer_id: targetId }).eq('company_id', companyId).eq('customer_id', sourceId),
  ])

  const { data: updatedTarget, error: updateError } = await supabase
    .from('customers')
    .update({
      business_id: mergeNullableText(target.business_id, source.business_id),
      vat_number: mergeNullableText(target.vat_number, source.vat_number),
      email: mergeNullableText(target.email, source.email),
      phone: mergeNullableText(target.phone, source.phone),
      billing_address_line1: mergeNullableText(target.billing_address_line1, source.billing_address_line1),
      billing_address_line2: mergeNullableText(target.billing_address_line2, source.billing_address_line2),
      billing_postal_code: mergeNullableText(target.billing_postal_code, source.billing_postal_code),
      billing_city: mergeNullableText(target.billing_city, source.billing_city),
      billing_country: mergeNullableText(target.billing_country, source.billing_country) ?? 'FI',
      notes: mergeNotes(target.notes, source.notes),
    })
    .eq('company_id', companyId)
    .eq('id', targetId)
    .select('*')
    .single()

  if (updateError || !updatedTarget) {
    throw updateError ?? new Error('Customer merge failed while updating the target record.')
  }

  const { error: deleteError } = await supabase.from('customers').delete().eq('company_id', companyId).eq('id', sourceId)
  if (deleteError) {
    throw deleteError
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'customer',
    entity_id: targetId,
    action: 'merge_duplicate',
    old_values: source,
    new_values: updatedTarget,
  })

  return updatedTarget as TableRow<'customers'>
}

export async function mergeVehicleDuplicate(companyId: string, userId: string, targetId: string, sourceId: string, client?: DbClient) {
  if (targetId === sourceId) {
    throw new Error('Source and target vehicles must be different.')
  }

  const supabase = await getDbClient(client)
  const [{ data: targetData }, { data: sourceData }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('company_id', companyId).eq('id', targetId).single(),
    supabase.from('vehicles').select('*').eq('company_id', companyId).eq('id', sourceId).single(),
  ])
  const target = targetData as TableRow<'vehicles'> | null
  const source = sourceData as TableRow<'vehicles'> | null

  if (!target || !source) {
    throw new Error('Vehicle merge failed because one of the records no longer exists.')
  }

  await Promise.all([
    supabase.from('transport_orders').update({ assigned_vehicle_id: targetId }).eq('company_id', companyId).eq('assigned_vehicle_id', sourceId),
    supabase.from('trips').update({ vehicle_id: targetId }).eq('company_id', companyId).eq('vehicle_id', sourceId),
  ])

  const { data: updatedTarget, error: updateError } = await supabase
    .from('vehicles')
    .update({
      make: mergeNullableText(target.make, source.make),
      model: mergeNullableText(target.model, source.model),
      year: target.year ?? source.year,
      fuel_type: mergeNullableText(target.fuel_type, source.fuel_type),
      current_km: Math.max(toNumber(target.current_km), toNumber(source.current_km)),
      next_service_km: target.next_service_km ?? source.next_service_km,
      is_active: target.is_active || source.is_active,
    })
    .eq('company_id', companyId)
    .eq('id', targetId)
    .select('*')
    .single()

  if (updateError || !updatedTarget) {
    throw updateError ?? new Error('Vehicle merge failed while updating the target record.')
  }

  const { error: deleteError } = await supabase.from('vehicles').delete().eq('company_id', companyId).eq('id', sourceId)
  if (deleteError) {
    throw deleteError
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'vehicle',
    entity_id: targetId,
    action: 'merge_duplicate',
    old_values: source,
    new_values: updatedTarget,
  })

  return updatedTarget as TableRow<'vehicles'>
}

export async function mergeDriverDuplicate(companyId: string, userId: string, targetId: string, sourceId: string, client?: DbClient) {
  if (targetId === sourceId) {
    throw new Error('Source and target drivers must be different.')
  }

  const supabase = await getDbClient(client)
  const [{ data: targetData }, { data: sourceData }] = await Promise.all([
    supabase.from('drivers').select('*').eq('company_id', companyId).eq('id', targetId).single(),
    supabase.from('drivers').select('*').eq('company_id', companyId).eq('id', sourceId).single(),
  ])
  const target = targetData as TableRow<'drivers'> | null
  const source = sourceData as TableRow<'drivers'> | null

  if (!target || !source) {
    throw new Error('Driver merge failed because one of the records no longer exists.')
  }

  if (target.auth_user_id && source.auth_user_id && target.auth_user_id !== source.auth_user_id) {
    throw new Error('Both driver records already have different auth links. Resolve the conflict manually before merging.')
  }

  await Promise.all([
    supabase.from('transport_orders').update({ assigned_driver_id: targetId }).eq('company_id', companyId).eq('assigned_driver_id', sourceId),
    supabase.from('trips').update({ driver_id: targetId }).eq('company_id', companyId).eq('driver_id', sourceId),
  ])

  const { data: updatedTarget, error: updateError } = await supabase
    .from('drivers')
    .update({
      auth_user_id: target.auth_user_id ?? source.auth_user_id,
      phone: mergeNullableText(target.phone, source.phone),
      email: mergeNullableText(target.email, source.email),
      license_type: mergeNullableText(target.license_type, source.license_type),
      employment_type: mergeNullableText(target.employment_type, source.employment_type),
      is_active: target.is_active || source.is_active,
    })
    .eq('company_id', companyId)
    .eq('id', targetId)
    .select('*')
    .single()

  if (updateError || !updatedTarget) {
    throw updateError ?? new Error('Driver merge failed while updating the target record.')
  }

  const { error: deleteError } = await supabase.from('drivers').delete().eq('company_id', companyId).eq('id', sourceId)
  if (deleteError) {
    throw deleteError
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'driver',
    entity_id: targetId,
    action: 'merge_duplicate',
    old_values: source,
    new_values: updatedTarget,
  })

  return updatedTarget as TableRow<'drivers'>
}
