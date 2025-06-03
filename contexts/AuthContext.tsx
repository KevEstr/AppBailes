"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthUser } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  name: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    console.log('🔐 AuthContext login called with:', { email })
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      console.log('📡 Login API response status:', response.status)
      
      const data = await response.json()
      
      console.log('📋 Login API response data:', data)

      if (response.ok) {
        console.log('👤 Setting user in context:', data.user)
        setUser(data.user)
        return { success: true }
      } else {
        console.log('⚠️ Login API returned error:', data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('🚨 Login API call failed:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(registerData)
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Register failed:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
    }
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 