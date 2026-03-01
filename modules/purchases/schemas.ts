import { z } from 'zod'

const isoDateString = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)

export const createVendorSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
})

export const createApInvoiceLineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number().min(0).max(100),
  expenseAccountNo: z.string().trim().min(1).default('4000'),
  vatAccountNo: z.string().trim().min(1).default('1570'),
})

export const createApInvoiceSchema = z.object({
  vendorId: z.string().uuid().optional().nullable(),
  vendorInvoiceNumber: z.string().trim().min(1).optional().nullable(),
  dueDate: isoDateString.optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  lines: z.array(createApInvoiceLineSchema).min(1),
})
