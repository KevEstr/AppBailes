import TrainerAttendanceHistory from "@/components/admin/TrainerAttendanceHistory";
import { InternalLayout } from "@/components/layouts/internal-layout";

export default function TrainerAttendancePage() {
  return (
    <InternalLayout 
      title="Asistencia de Entrenadores" 
      description="Reportes de asistencia de Entrenadores"
    >
      <TrainerAttendanceHistory />
    </InternalLayout>
  );
}
