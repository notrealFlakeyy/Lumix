import { z } from 'zod'

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const normalizeNumberInput = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim().replace(/\s+/g, '').replace(',', '.')
  }
  return value
}

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
})

export const createInvoiceLineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.preprocess(normalizeNumberInput, z.coerce.number().positive()),
  unitPrice: z.preprocess(normalizeNumberInput, z.coerce.number().nonnegative()),
  vatRate: z.preprocess(normalizeNumberInput, z.coerce.number().min(0).max(100)),
})

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().trim().min(1).optional(),
  referenceNumber: z.string().trim().min(1).optional().nullable(),
  dueDate: isoDateString.optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  lines: z.array(createInvoiceLineSchema).min(1),
})
