import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { MassiveMessages } from "@/components/massive-messages"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Notificaciones - Paradise",
  description: "Sistema de comunicación masiva con estudiantes, notificaciones y mensajes automáticos",
}

export default function MessagesPage() {
  return (
    <InternalLayout 
      title="Notificaciones" 
      description="Comunicación con estudiantes"
    >
      <MassiveMessages />
    </InternalLayout>
  )
} 