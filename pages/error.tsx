import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi', permanent: false } }
}

export default function ErrorPage() {
  return null
}

