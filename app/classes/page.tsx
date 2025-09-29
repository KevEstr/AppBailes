import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { ClassManagementNew } from "@/components/class-management-new"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Gestión de Clases - Paradise",
  description: "Organiza horarios, grupos de baile y administra inscripciones de estudiantes",
}

export default function ClassesPage() {
  return (
    <InternalLayout 
      title="Gestión de Clases" 
      description="Organiza horarios y grupos de clases"
    >
      <ClassManagementNew />
    </InternalLayout>

    
  )
} 