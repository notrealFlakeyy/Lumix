import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/customers', permanent: false } }
}

export default function Clients() {
  return null
}
