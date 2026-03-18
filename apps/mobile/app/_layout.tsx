import { Stack } from 'expo-router'

import { AuthProvider } from '@/src/providers/auth-provider'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: '#f7efe4',
          },
          headerTintColor: '#19263f',
          headerTitleStyle: {
            fontWeight: '800',
          },
        }}
      />
    </AuthProvider>
  )
}
