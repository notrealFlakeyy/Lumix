import { useState } from 'react'
import { Text } from 'react-native'

import { Button, Field, Label, Screen, Section } from '@/src/components/ui'
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
      <Section title="Lumix Driver" subtitle="Sign in with the same Supabase account you use in the web app.">
        <Label>Email</Label>
        <Field autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Label>Password</Label>
        <Field secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text style={{ color: '#b91c1c' }}>{error}</Text> : null}
        <Button title={submitting || loading ? 'Signing in...' : 'Sign in'} onPress={handleSignIn} disabled={submitting || loading} />
      </Section>
    </Screen>
  )
}
