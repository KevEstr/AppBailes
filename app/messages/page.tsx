import { InternalLayout } from "@/components/layouts/internal-layout"
import { MassiveMessages } from "@/components/massive-messages"

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