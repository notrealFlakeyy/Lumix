import { useState } from 'react'
import { View } from 'react-native'

import { AppText, Badge, Button, Field, HeroCard, Label, Screen, Section, StatCard, uiStyles } from '@/src/components/ui'
import { useAuth } from '@/src/providers/auth-provider'

export default function SignInScreen() {
  const { signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSignIn() {
    try {
      setSubmitting(true)
      setError(null)
      await signIn(email.trim(), password)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen>
      <HeroCard
        eyebrow="Lumix Driver"
        title="Run the day from one calm control room."
        subtitle="A transport workflow with the clean energy of a modern fitness app: focused cards, fast actions, and less clutter on the road."
      >
        <View style={uiStyles.wrap}>
          <StatCard label="Trips" value="Live" tone="dark" />
          <StatCard label="Proof" value="Ready" tone="mint" />
        </View>
      </HeroCard>

      <Section title="Sign in" subtitle="Use the same Supabase account you use in the web app.">
        <View style={uiStyles.row}>
          <Badge label="Mobile" tone="accent" />
          <Badge label="Driver flow" tone="success" />
        </View>
        <Label>Email</Label>
        <Field autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Label>Password</Label>
        <Field secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <AppText danger>{error}</AppText> : null}
        <Button title={submitting || loading ? 'Signing in...' : 'Sign in'} onPress={handleSignIn} disabled={submitting || loading} />
        <AppText muted>Tip: if login fails, check that the account is linked to a real driver profile in the web app team settings.</AppText>
      </Section>
    </Screen>
  )
}
