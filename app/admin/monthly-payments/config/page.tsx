import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { MonthlyFeeConfig } from "@/components/monthly-payments/MonthlyFeeConfig"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Configuración de Mensualidades - Paradise",
  description: "Configurar valores y parámetros del sistema de mensualidades",
}

export default function MonthlyPaymentsConfigPage() {
  return (
    <InternalLayout 
      title="Configuración de Mensualidades" 
      description="Configura valores y parámetros del sistema"
    >
      <MonthlyFeeConfig />
    </InternalLayout>
  )
} 