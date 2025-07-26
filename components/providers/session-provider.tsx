"use client"

import React from "react"
import { SessionProvider } from "next-auth/react"

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchInterval={0} // Deshabilitar refetch automático para evitar requests innecesarios
      refetchOnWindowFocus={false} // Solo refetch cuando sea necesario
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
} 