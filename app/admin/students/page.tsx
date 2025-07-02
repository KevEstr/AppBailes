"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { StudentsManagement } from "@/components/students-management"
import { Loading } from "@/components/ui/loading"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserCheck } from "lucide-react"
import Link from "next/link"

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Panel
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Gestión de Estudiantes</h1>
                  <p className="text-gray-400">Administrar estudiantes e inscripciones del sistema</p>
                </div>
              </div>
            </div>
          </div>

          {/* Students Management Component */}
          <StudentsManagement />
        </div>
      </div>
    </div>
  )
} 