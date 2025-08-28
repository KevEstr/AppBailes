import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { AttendanceSystem } from "@/components/attendance-system"
import ClassAttendanceTikTok from "@/components/class-attendance-tiktok"
import { AuthGuard } from "@/components/auth-guard"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Asistencia - Paradise Dance Academy",
  description: "Control visual de asistencias y registro de estudiantes en clases de baile",
}

function AttendanceContent() {
  return (
    <InternalLayout 
      title="Asistencia de Estudiantes" 
      description="Control visual de asistencias"
    >
      <ClassAttendanceTikTok />
      {/* <AttendanceSystem /> */}
    </InternalLayout>
  )
}

export default function AttendancePage() {
  return (
    <AuthGuard>
      <AttendanceContent />
    </AuthGuard>
  )
} 