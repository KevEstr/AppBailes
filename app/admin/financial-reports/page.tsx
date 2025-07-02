import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { FinancialDashboard } from "@/components/admin/FinancialDashboard"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Consolidado Financiero - Paradise Dance Academy",
  description: "Reportes y análisis financiero completo",
}

export default function FinancialReportsPage() {
  return (
    <InternalLayout 
      title="Consolidado Financiero" 
      description="Reportes y análisis financiero completo"
    >
      <FinancialDashboard />
    </InternalLayout>
  )
} 