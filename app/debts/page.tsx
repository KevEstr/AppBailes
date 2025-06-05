import { InternalLayout } from "@/components/layouts/internal-layout"
import { DebtNotifications } from "@/components/debt-notifications"

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