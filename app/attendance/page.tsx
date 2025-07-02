import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { AttendanceSystem } from "@/components/attendance-system"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Asistencia - Paradise Dance Academy",
  description: "Control visual de asistencias y registro de estudiantes en clases de baile",
}

export default function AttendancePage() {
  return (
    <InternalLayout 
      title="Asistencia de Estudiantes" 
      description="Control visual de asistencias"
    >
      <AttendanceSystem />
    </InternalLayout>
  )
} 