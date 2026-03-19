import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/fi/tasks', permanent: false } }
}

export default function Tasks() {
  return null
}
