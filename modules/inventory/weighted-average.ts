export type Movement = { qty: number; unitCost?: number }

export function weightedAverageUnitCost(movements: Movement[]) {
  let qtyOnHand = 0
  let totalCost = 0

  for (const m of movements) {
    if (m.qty > 0) {
      const cost = (m.unitCost ?? 0) * m.qty
      qtyOnHand += m.qty
      totalCost += cost
    } else if (m.qty < 0) {
      const avg = qtyOnHand > 0 ? totalCost / qtyOnHand : 0
      const outQty = Math.min(qtyOnHand, Math.abs(m.qty))
      qtyOnHand -= outQty
      totalCost -= avg * outQty
    }
  }

  return qtyOnHand > 0 ? totalCost / qtyOnHand : 0
}

