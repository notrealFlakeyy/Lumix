import { getInvoiceById } from '@/lib/db/queries/invoices'
import { requireCompany } from '@/lib/auth/require-company'
import { buildInvoicePdf } from '@/lib/invoices/pdf'
import { buildInvoicePdfFileName } from '@/lib/utils/invoice'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const bundle = await getInvoiceById(membership.company_id, id, undefined, membership.branchIds)

  if (!bundle) {
    return new Response('Invoice not found.', { status: 404 })
  }

  const pdfBuffer = await buildInvoicePdf(bundle)
  const url = new URL(request.url)
  const disposition = url.searchParams.get('download') === '1' ? 'attachment' : 'inline'
  const fileName = buildInvoicePdfFileName(bundle.invoice.invoice_number)

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdfBuffer.byteLength),
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
