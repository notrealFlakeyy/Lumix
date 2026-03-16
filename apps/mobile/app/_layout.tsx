import { Stack } from 'expo-router'

import { AuthProvider } from '@/src/providers/auth-provider'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: '#eef3f7',
          },
          headerTintColor: '#0f172a',
        }}
      />
    </AuthProvider>
  )
}
