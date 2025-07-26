"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface UseAuthSessionOptions {
  required?: boolean
  requiredRole?: string
  redirectTo?: string
  onUnauthenticated?: () => void
}

export function useAuthSession(options: UseAuthSessionOptions = {}) {
  const { 
    required = true, 
    requiredRole, 
    redirectTo = "/login",
    onUnauthenticated 
  } = options
  
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    // Verificar si se requiere autenticación
    if (required && status === "unauthenticated") {
      console.log("useAuthSession: No session found, redirecting to", redirectTo)
      onUnauthenticated?.()
      router.push(redirectTo)
      return
    }

    // Verificar rol requerido
    if (session?.user && requiredRole && session.user.role !== requiredRole) {
      console.log("useAuthSession: Wrong role. Required:", requiredRole, "Got:", session.user.role)
      
      // Redirigir según el rol del usuario
      const roleRedirects = {
        ADMIN: "/admin",
        TEACHER: "/teacher", 
        STUDENT: "/student"
      }
      
      const userRole = session.user.role as keyof typeof roleRedirects
      const roleRedirect = roleRedirects[userRole] || redirectTo
      
      router.push(roleRedirect)
    }

  }, [session, status, required, requiredRole, redirectTo, router, onUnauthenticated])

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated" && !!session?.user,
    user: session?.user || null
  }
}
