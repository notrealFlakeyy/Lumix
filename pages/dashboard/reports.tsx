import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/reporting', permanent: false } }
}

export default function Reports() {
  return null
}

