import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { mapUser, type ApiUser } from '@/lib/apiMappers'
import { track } from '@/lib/analytics'
import type { UserProfile } from '@/lib/types'

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  country?: string
  dateOfBirth?: string
  address?: string
  city?: string
  postalCode?: string
  acceptTerms: boolean
  ref?: string
}

export interface ProfilePatch {
  name?: string
  phone?: string
  country?: string
  notifySecurity?: boolean
  notifyProduct?: boolean
  notifyMarketing?: boolean
}

interface AuthContextValue {
  user: UserProfile | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string, totp?: string, emailOtp?: string) => Promise<UserProfile>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<UserProfile>
  updateProfile: (patch: ProfilePatch) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const u = await api.get<ApiUser>('/users/me')
    const mapped = mapUser(u)
    setUser(mapped)
    return mapped
  }, [])

  // Bootstrap: restore an existing session (the api client auto-refreshes if
  // the access token is stale but a valid refresh cookie exists).
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const u = await api.get<ApiUser>('/users/me')
        if (active) setUser(mapUser(u))
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, totp?: string, emailOtp?: string) => {
      await api.post('/auth/login', {
        email,
        password,
        ...(totp ? { totp } : {}),
        ...(emailOtp ? { emailOtp } : {}),
      })
      track('login', { method: 'email' })
      return refreshUser()
    },
    [refreshUser],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await api.post('/auth/register', payload)
      track('sign_up', { method: 'email' })
      await refreshUser()
    },
    [refreshUser],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const body: Record<string, string | boolean> = {}
    if (patch.name) {
      const [firstName, ...rest] = patch.name.trim().split(' ')
      body.firstName = firstName
      body.lastName = rest.join(' ') || firstName
    }
    if (patch.phone !== undefined) body.phone = patch.phone
    if (patch.country !== undefined) body.country = patch.country
    if (patch.notifySecurity !== undefined) body.notifySecurity = patch.notifySecurity
    if (patch.notifyProduct !== undefined) body.notifyProduct = patch.notifyProduct
    if (patch.notifyMarketing !== undefined) body.notifyMarketing = patch.notifyMarketing
    const u = await api.patch<ApiUser>('/users/me', body)
    setUser(mapUser(u))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
