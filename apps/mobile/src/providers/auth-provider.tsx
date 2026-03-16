import { Session } from '@supabase/supabase-js'
import { useRouter, useSegments } from 'expo-router'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { mobileApi } from '@/src/lib/mobile-api'
import { supabase } from '@/src/lib/supabase'
import type { MobileMeResponse } from '@/src/types/mobile'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  me: Extract<MobileMeResponse, { ok: true }> | null
  refreshMe: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setCompanyId: (companyId: string | null) => Promise<void>
  companyId: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<Extract<MobileMeResponse, { ok: true }> | null>(null)
  const [companyId, setCompanyIdState] = useState<string | null>(null)

  async function refreshMeFor(sessionValue: Session | null, nextCompanyId = companyId) {
    if (!sessionValue) {
      setMe(null)
      return
    }

    try {
      const response = await mobileApi.me(sessionValue, nextCompanyId)

      if ('ok' in response && response.ok) {
        setMe(response)
        if (!nextCompanyId) {
          setCompanyIdState(response.membership.company_id)
        }
      }
    } catch {
      setMe(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null)
      await refreshMeFor(data.session ?? null, null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await refreshMeFor(nextSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
      return
    }

    if (session && inAuthGroup) {
      router.replace('/(app)/home')
    }
  }, [loading, router, segments, session])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      me,
      companyId,
      refreshMe: async () => {
        await refreshMeFor(session)
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
      setCompanyId: async (nextCompanyId) => {
        setCompanyIdState(nextCompanyId)
        await refreshMeFor(session, nextCompanyId)
      },
    }),
    [companyId, loading, me, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return value
}
