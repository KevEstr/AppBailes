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
      refetchInterval={60}
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
} 