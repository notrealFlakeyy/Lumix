import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/payroll', permanent: false } }
}

export default function Time() {
  return null
}

