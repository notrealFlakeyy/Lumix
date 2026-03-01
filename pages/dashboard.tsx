import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/dashboard', permanent: false } }
}

export default function Dashboard() {
  return null
}

