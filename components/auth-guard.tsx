"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string
  redirectTo?: string
}

export function AuthGuard({ children, requiredRole, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar directamente con la API de sesión
        const response = await fetch("/api/auth/session")
        const session = await response.json()
        
        console.log("AuthGuard - Session from API:", session)

        if (!session?.user) {
          console.log("AuthGuard - No session, redirecting to", redirectTo)
          router.push(redirectTo)
          return
        }

        if (requiredRole && session.user.role !== requiredRole) {
          console.log("AuthGuard - Wrong role. Required:", requiredRole, "Got:", session.user.role)
          router.push(redirectTo)
          return
        }

        console.log("AuthGuard - Auth check passed")
      } catch (error) {
        console.error("AuthGuard - Error checking session:", error)
        router.push(redirectTo)
      }
    }

    checkAuth()
  }, [router, requiredRole, redirectTo])

  return <>{children}</>
}
