import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/invoices/new', permanent: false } }
}

export default function NewInvoice() {
  return null
}
