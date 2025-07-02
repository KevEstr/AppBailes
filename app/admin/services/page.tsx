import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { ServicesManager } from "@/components/admin/ServicesManager"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Gestión de Servicios - Paradise Dance Academy", 
  description: "Servicios adicionales y tarifas diferenciadas",
}

export default function ServicesPage() {
  return (
    <InternalLayout 
      title="Gestión de Servicios" 
      description="Servicios adicionales y tarifas diferenciadas"
    >
      <ServicesManager />
    </InternalLayout>
  )
} 