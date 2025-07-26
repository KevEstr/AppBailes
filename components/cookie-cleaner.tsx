"use client"

import { useEffect } from "react"

export function CookieCleaner() {
  useEffect(() => {
    // Solo ejecutar una vez por sesión
    const hasCleanedCookies = sessionStorage.getItem('cookies-cleaned')
    
    if (!hasCleanedCookies) {
      console.log("🧹 Cleaning old cookies to prevent JWT errors...")
      
      // Limpiar cookies específicas de NextAuth
      const cookiesToClear = [
        'next-auth.session-token',
        'next-auth.csrf-token', 
        'next-auth.callback-url',
        '__Secure-next-auth.session-token',
        '__Host-next-auth.csrf-token'
      ]
      
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`
      })
      
      // Marcar como limpiado
      sessionStorage.setItem('cookies-cleaned', 'true')
      console.log("✅ Cookies cleaned successfully")
    }
  }, [])

  return null
}
