import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/signup', permanent: false } }
}

export default function Signup() {
  return null
}

