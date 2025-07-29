"use client"

import { useEffect, useState } from "react"
import { Loading } from "@/components/ui/loading"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Evitar renderizado en el servidor para prevenir hydration mismatch
  if (!isClient) {
    return <Loading message="Inicializando..." />
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  )
} 