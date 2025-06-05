import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { DebtNotifications } from "@/components/debt-notifications"

export const metadata: Metadata = {
  title: "Control de Pagos - Paradise Dance Academy",
  description: "Seguimiento de mensualidades, control de deudas y gestión de pagos de estudiantes",
}

export default function DebtsPage() {
  return (
    <InternalLayout 
      title="Control Pagos" 
      description="Seguimiento de mensualidades"
    >
      <DebtNotifications />
    </InternalLayout>
  )
} 