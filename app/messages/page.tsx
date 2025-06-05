import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { MassiveMessages } from "@/components/massive-messages"

export const metadata: Metadata = {
  title: "Notificaciones - Paradise Dance Academy",
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