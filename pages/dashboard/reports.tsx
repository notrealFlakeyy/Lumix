import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/reports', permanent: false } }
}

export default function Reports() {
  return null
}
