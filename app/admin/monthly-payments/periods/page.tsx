import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import PaymentPeriodsManager from "@/components/monthly-payments/PaymentPeriodsManager"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Gestión de Períodos - Paradise Dance Academy",
  description: "Administrar períodos mensuales de pago",
}

export default function PaymentPeriodsPage() {
  return (
    <InternalLayout 
      title="Gestión de Períodos" 
      description="Administra períodos mensuales de pago"
    >
      <PaymentPeriodsManager />
    </InternalLayout>
  )
} 