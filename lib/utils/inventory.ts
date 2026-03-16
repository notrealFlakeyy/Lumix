import type { InventoryMovementType } from '@/types/app'

import { toNumber } from '@/lib/utils/numbers'

export function getInventoryMovementSignedQuantity(
  movementType: InventoryMovementType | string,
  quantity: number | string | null | undefined,
) {
  const numericQuantity = toNumber(quantity)
  return movementType === 'issue' || movementType === 'adjustment_out' || movementType === 'transfer_out'
    ? numericQuantity * -1
    : numericQuantity
}

export function getInventoryMovementLabel(movementType: InventoryMovementType | string) {
  switch (movementType) {
    case 'receipt':
      return 'Receipt'
    case 'issue':
      return 'Issue'
    case 'adjustment_in':
      return 'Adjustment In'
    case 'adjustment_out':
      return 'Adjustment Out'
    case 'transfer_in':
      return 'Transfer In'
    case 'transfer_out':
      return 'Transfer Out'
    default:
      return movementType
  }
}

export function getInventoryMovementDirection(movementType: InventoryMovementType | string) {
  return getInventoryMovementSignedQuantity(movementType, 1) >= 0 ? 'in' : 'out'
}
