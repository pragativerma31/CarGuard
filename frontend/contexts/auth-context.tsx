'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/firebase'

interface User {
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = authService.getCurrentUser()
    setUser(storedUser)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    
    const result = await authService.login(email, password)
    
    if (result.success && result.user) {
      localStorage.setItem('carguard_user', JSON.stringify(result.user))
      setUser(result.user)
      setIsLoading(false)
      return { success: true }
    }
    
    setIsLoading(false)
    return { success: false, error: 'Invalid credentials' }
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true)
    
    // Mock signup - in production, this would call authService.signup
    const newUser = { email, name }
    localStorage.setItem('carguard_user', JSON.stringify(newUser))
    setUser(newUser)
    setIsLoading(false)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    localStorage.removeItem('carguard_user')
    setUser(null)
    router.push('/')
  }, [router])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
