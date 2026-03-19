import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/maintenance', permanent: false } }
}

export default function Maintenance() {
  return null
}
