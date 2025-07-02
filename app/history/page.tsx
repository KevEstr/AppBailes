import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { AttendanceHistory } from "@/components/attendance-history"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Análisis - Paradise Dance Academy",
  description: "Reportes de asistencia, estadísticas de clases y análisis histórico de estudiantes",
}

export default function HistoryPage() {
  return (
    <InternalLayout 
      title="Análisis" 
      description="Reportes de asistencia"
    >
      <AttendanceHistory />
    </InternalLayout>
  )
} 