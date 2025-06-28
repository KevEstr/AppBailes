import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { MonthlyPaymentsDashboard } from "@/components/monthly-payments/MonthlyPaymentsDashboard"

export const metadata: Metadata = {
  title: "Sistema de Mensualidades - Paradise Dance Academy",
  description: "Gestión moderna de pagos mensuales",
}

export default function MonthlyPaymentsPage() {
  return (
    <InternalLayout 
      title="Sistema de Mensualidades" 
      description="Gestión moderna de pagos mensuales"
    >
      <MonthlyPaymentsDashboard />
    </InternalLayout>
  )
} 