import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { ClassManagementNew } from "@/components/class-management-new"

export const metadata: Metadata = {
  title: "Gestión de Clases - Paradise Dance Academy",
  description: "Organiza horarios, grupos de baile y administra inscripciones de estudiantes",
}

export default function ClassesPage() {
  return (
    <InternalLayout 
      title="Gestión de Clases" 
      description="Organiza horarios y grupos de baile"
    >
      <ClassManagementNew />
    </InternalLayout>
  )
} 