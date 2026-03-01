import { redirect } from 'next/navigation'

export default async function PurchasesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/purchases/invoices`)
}
