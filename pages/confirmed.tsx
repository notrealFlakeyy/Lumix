import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/login', permanent: false } }
}

export default function Confirmed() {
  return null
}

