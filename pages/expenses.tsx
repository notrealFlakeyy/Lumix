import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/expenses', permanent: false } }
}

export default function Expenses() {
  return null
}
