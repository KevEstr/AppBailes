import { InternalLayout } from '@/components/layouts/internal-layout';
import { TestProofNotifications } from '@/components/admin/TestProofNotifications';

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