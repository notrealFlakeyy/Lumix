export type InvoiceDeliveryChannel = 'email' | 'mock'

export type DeliverInvoiceInput = {
  invoiceId: string
  toEmail: string
  subject: string
  html: string
  pdfBase64?: string
}

export type DeliverInvoiceResult = { ok: true } | { ok: false; reason: string }

export interface InvoiceDeliveryProvider {
  channel: InvoiceDeliveryChannel
  deliver(input: DeliverInvoiceInput): Promise<DeliverInvoiceResult>
}

export class MockInvoiceDeliveryProvider implements InvoiceDeliveryProvider {
  channel: InvoiceDeliveryChannel = 'mock'

  async deliver(): Promise<DeliverInvoiceResult> {
    return { ok: true }
  }
}

