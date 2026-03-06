export function nextOrderNumber(sequence: number) {
  return `ORD-${String(sequence).padStart(4, '0')}`
}

export function nextInvoiceNumber(sequence: number) {
  return `INV-${String(sequence).padStart(4, '0')}`
}
