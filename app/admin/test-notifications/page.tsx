import { InternalLayout } from '@/components/layouts/internal-layout';
import { TestProofNotifications } from '@/components/admin/TestProofNotifications';

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export default function TestNotificationsPage() {
  return (
    <InternalLayout 
      title="Prueba de Notificaciones" 
      description="Probar notificaciones de WhatsApp para comprobantes de pago"
    >
      <TestProofNotifications />
    </InternalLayout>
  );
} 