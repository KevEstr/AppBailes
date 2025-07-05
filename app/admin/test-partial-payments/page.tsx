import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { PartialPaymentDemo } from '@/components/admin/PartialPaymentDemo';

export const metadata: Metadata = {
  title: "Prueba: Pagos Parciales",
  description: "Demostración del sistema de pagos parciales y gestión de deudas"
}

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export default function TestPartialPaymentsPage() {
  return (
    <InternalLayout 
      title="🧪 Prueba: Sistema de Pagos Parciales" 
      description="Demostración completa del sistema de pagos parciales con creación automática de deudas"
    >
      <PartialPaymentDemo />
    </InternalLayout>
  );
} 