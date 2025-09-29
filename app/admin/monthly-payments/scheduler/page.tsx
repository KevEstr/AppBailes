import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { PaymentSchedulerDashboard } from "@/components/monthly-payments/PaymentSchedulerDashboard"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Scheduler Automático - Paradise",
  description: "Sistema de envío automático de enlaces de pago por WhatsApp",
}

export default function PaymentSchedulerPage() {
  return (
    <InternalLayout 
      title="Scheduler Automático" 
      description="Sistema de envío automático de enlaces de pago por WhatsApp"
    >
      <PaymentSchedulerDashboard />
    </InternalLayout>
  )
}
