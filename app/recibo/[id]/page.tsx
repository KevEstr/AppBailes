import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DigitalReceipt } from '@/components/digital-receipt';

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

async function getReceiptData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/recibo/${id}`, {
      cache: 'no-store' // Siempre obtener datos frescos
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.receipt;
  } catch (error) {
    console.error('Error obteniendo recibo:', error);
    return null;
  }
}

export async function generateMetadata({ params }: ReceiptPageProps): Promise<Metadata> {
  const { id } = await params;
  const receiptData = await getReceiptData(id);
  
  if (!receiptData) {
    return {
      title: 'Recibo no encontrado - Paradise Dance Academy',
    };
  }

  return {
    title: `Recibo ${receiptData.receiptNumber} - ${receiptData.studentName} - Paradise Dance Academy`,
    description: `Recibo de pago para ${receiptData.studentName} por concepto de ${receiptData.concept}`,
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const receiptData = await getReceiptData(id);

  if (!receiptData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Recibo Digital - Paradise Dance Academy
            </h1>
            <p className="text-gray-300">
              Recibo #{receiptData.receiptNumber} - {receiptData.studentName}
            </p>
          </div>
          
          <DigitalReceipt data={receiptData} />
          
          <div className="mt-8 text-center text-gray-400 text-sm">
            <p>Este es un recibo digital verificado de Paradise Dance Academy</p>
            <p>Para cualquier consulta, contacta: 320 565 6520</p>
          </div>
        </div>
      </div>
    </div>
  );
} 