import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/invoices', permanent: false } }
}

export default function Invoices() {
  return null
}
