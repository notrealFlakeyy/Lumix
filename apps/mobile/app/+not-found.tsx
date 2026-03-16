import { Link } from 'expo-router'

import { Button, Screen, Section } from '@/src/components/ui'

export default function NotFoundScreen() {
  return (
    <Screen>
      <Section title="Page not found" subtitle="The native app route does not exist.">
        <Link href="/(app)/home" asChild>
          <Button title="Back to home" />
        </Link>
      </Section>
    </Screen>
  )
}
