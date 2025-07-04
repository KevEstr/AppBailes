"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { StudentsManagement } from "@/components/students-management"
import { Loading } from "@/components/ui/loading"

import { InternalLayout } from "@/components/layouts/internal-layout"

export default function AdminStudentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== "ADMIN") {
      router.push("/login")
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return <Loading message="Cargando gestión de estudiantes..." />
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <InternalLayout 
      title="Gestión de Estudiantes" 
      description="Administrar estudiantes e inscripciones del sistema"
    >
      <StudentsManagement />
    </InternalLayout>
  )
} 