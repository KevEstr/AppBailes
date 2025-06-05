import { InternalLayout } from "@/components/layouts/internal-layout"
import { AttendanceHistory } from "@/components/attendance-history"

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