import Constants from 'expo-constants'

function getEnv(name: 'EXPO_PUBLIC_API_URL' | 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name] ?? Constants.expoConfig?.extra?.[name]

  if (!value || typeof value !== 'string') {
    throw new Error(`Missing required native env var: ${name}`)
  }

  return value
}

export const mobileEnv = {
  apiUrl: getEnv('EXPO_PUBLIC_API_URL').replace(/\/$/, ''),
  supabaseUrl: getEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
}
