import { createContext, useContext } from 'react'
import type { UserProfile } from '../../shared/api/types.ts'

// auth data and actions exposed to the app
export type AuthContextValue = {
  user: UserProfile | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

// access the auth context and fail early if the provider is missing
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}