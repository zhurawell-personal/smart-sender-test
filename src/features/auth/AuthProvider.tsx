import { type ReactNode, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setSessionExpiredHandler } from '../../shared/api/apiClient.ts'
import { signIn, signOut } from './authApi.ts'
import type { UserProfile } from '../../shared/api/types.ts'
import { AuthContext } from './authContext.tsx'

// manage auth state and provide it to child components
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const queryClient = useQueryClient()

  // clear auth state when apiClient reports an expired session
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      queryClient.clear()
    })

    return () => setSessionExpiredHandler(null)
  }, [queryClient])

  async function login(email: string, password: string) {
    const currentUser = await signIn(email, password)
    setUser(currentUser)
  }

  // clear local auth state even if session revocation fails
  async function logout() {
    try {
      await signOut()
    } finally {
      setUser(null)
      queryClient.clear()
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}