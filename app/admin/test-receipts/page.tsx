import { Metadata } from 'next';
import { InternalLayout } from '@/components/layouts/internal-layout';
import { DigitalReceiptTester } from '@/components/admin/DigitalReceiptTester';

export const metadata: Metadata = {
  title: 'Prueba de Recibos Digitales - Paradise Dance Academy',
  description: 'Herramienta para probar la generación de recibos digitales profesionales',
};

export default function TestReceiptsPage() {
  return (
    <InternalLayout 
      title="Prueba de Recibos Digitales" 
      description="Genera y prueba recibos digitales profesionales"
    >
      <DigitalReceiptTester />
    </InternalLayout>
  );
} 