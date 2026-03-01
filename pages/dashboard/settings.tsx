import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/settings', permanent: false } }
}

export default function Settings() {
  return null
}

