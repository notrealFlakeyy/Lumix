export function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key)
  return value.length > 0 ? value : undefined
}

export function getCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

export function datetimeLocalToIso(value: string | undefined) {
  if (!value) return undefined
  return new Date(value).toISOString()
}

export function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 16)
}

export function parseInvoiceItems(formData: FormData) {
  const items: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number; line_total: number }> = []

  for (let index = 0; index < 6; index += 1) {
    const description = getString(formData, `item_description_${index}`)
    if (!description) continue

    const quantity = Number(formData.get(`item_quantity_${index}`) ?? 1)
    const unitPrice = Number(formData.get(`item_unit_price_${index}`) ?? 0)
    const vatRate = Number(formData.get(`item_vat_rate_${index}`) ?? 25.5)
    items.push({
      description,
      quantity,
      unit_price: unitPrice,
      vat_rate: vatRate,
      line_total: Number((quantity * unitPrice).toFixed(2)),
    })
  }

  return items
}
