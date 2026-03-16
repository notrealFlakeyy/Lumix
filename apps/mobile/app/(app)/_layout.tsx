import { Redirect, Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { useAuth } from '@/src/providers/auth-provider'

function SignOutButton() {
  const { signOut } = useAuth()

  return (
    <Pressable onPress={() => void signOut()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: '#0f172a', fontWeight: '600' }}>Sign out</Text>
    </Pressable>
  )
}

export default function AppLayout() {
  const { loading, session } = useAuth()

  if (!loading && !session) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <Stack
      screenOptions={{
        headerRight: () => <SignOutButton />,
      }}
    >
      <Stack.Screen name="home" options={{ title: 'Driver Home' }} />
      <Stack.Screen name="documents" options={{ title: 'Documents' }} />
      <Stack.Screen name="time" options={{ title: 'Time' }} />
      <Stack.Screen name="trips/index" options={{ title: 'Trips' }} />
      <Stack.Screen name="trips/[id]" options={{ title: 'Trip detail' }} />
    </Stack>
  )
}
