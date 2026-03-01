import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/login', permanent: false } }
}

export default function Login() {
  return null
}

