import { Redirect, Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { useAuth } from '@/src/providers/auth-provider'

function SignOutButton() {
  const { signOut } = useAuth()

  return (
    <Pressable
      onPress={() => void signOut()}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#fff7ec',
        borderWidth: 1,
        borderColor: '#eadbc7',
      }}
    >
      <Text style={{ color: '#19263f', fontWeight: '700' }}>Sign out</Text>
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
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#f7efe4',
        },
        headerTintColor: '#19263f',
        headerTitleStyle: {
          fontWeight: '800',
        },
      }}
    >
      <Stack.Screen name="home" options={{ title: 'Today' }} />
      <Stack.Screen name="documents" options={{ title: 'Documents' }} />
      <Stack.Screen name="time" options={{ title: 'Time' }} />
      <Stack.Screen name="trips/index" options={{ title: 'Trips' }} />
      <Stack.Screen name="trips/[id]" options={{ title: 'Trip detail' }} />
    </Stack>
  )
}
