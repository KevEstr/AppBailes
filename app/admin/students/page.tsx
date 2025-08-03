"use client"

import { StudentsManagement } from "@/components/students-management"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { AuthGuard } from "@/components/auth-guard"

function AdminStudentsContent() {
  return (
    <InternalLayout 
      title="Gestión de Estudiantes" 
      description="Administrar estudiantes e inscripciones del sistema"
    >
      <StudentsManagement />
    </InternalLayout>
  )
}

export default function AdminStudentsPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <AdminStudentsContent />
    </AuthGuard>
  )
} 