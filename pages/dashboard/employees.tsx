import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/drivers', permanent: false } }
}

export default function Employees() {
  return null
}
