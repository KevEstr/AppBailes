import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { StudentsManagement } from "@/components/students-management"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Gestión de Estudiantes - Paradise",
  description: "Administrar estudiantes inscritos, ver detalles, activar/desactivar y editar información",
}

export default function StudentsPage() {
  return (
    <InternalLayout 
      title="Gestión de Estudiantes" 
      description="Administrar estudiantes inscritos"
    >
      <StudentsManagement />
    </InternalLayout>
  )
} 