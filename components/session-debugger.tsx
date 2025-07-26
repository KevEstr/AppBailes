"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"

export function SessionDebugger() {
  const { data: session, status } = useSession()

  useEffect(() => {
    console.log("🔍 SessionDebugger - Status:", status)
    console.log("🔍 SessionDebugger - Session:", session)
    
    if (status === "authenticated" && session?.user) {
      console.log("✅ User is authenticated:", {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        trainerId: session.user.trainerId
      })
    } else if (status === "unauthenticated") {
      console.log("❌ User is not authenticated")
    } else if (status === "loading") {
      console.log("⏳ Session is loading...")
    }
  }, [session, status])

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>Status:</strong> {status}</div>
      {session?.user && (
        <>
          <div><strong>Email:</strong> {session.user.email}</div>
          <div><strong>Role:</strong> {session.user.role}</div>
          <div><strong>ID:</strong> {session.user.id}</div>
        </>
      )}
    </div>
  )
}
