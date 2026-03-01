import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/sales/customers', permanent: false } }
}

export default function Clients() {
  return null
}

