import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/time', permanent: false } }
}

export default function Time() {
  return null
}
