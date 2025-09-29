import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DigitalReceipt } from '@/components/digital-receipt';
import { VolleyballReceipt } from '@/components/volleyball-receipt';

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
        title: 'Recibo no encontrado - Paradise',
    };
  }

  const academyName = receiptData.sport === 'VOLLEYBALL' ? 'Paradise Volleyball' : 'Paradise Dance Academy';

  return {
    title: `Recibo ${receiptData.receiptNumber} - ${receiptData.studentName} - ${academyName}`,
    description: `Recibo de pago para ${receiptData.studentName} por concepto de ${receiptData.concept}`,
  };
}

export default async function ReceiptPage({ params }: Readonly<ReceiptPageProps>) {
  const { id } = await params;
  const receiptData = await getReceiptData(id);

  if (!receiptData) {
    notFound();
  }

  // Determinar qué componente de recibo usar basado en el deporte
  const isVolleyball = receiptData.sport === 'VOLLEYBALL';
  const academyName = isVolleyball ? 'Paradise Volleyball' : 'Paradise Dance Academy';
  const bgColor = isVolleyball ? 'bg-gray-50' : 'bg-gray-900';
  const textColor = isVolleyball ? 'text-gray-900' : 'text-white';
  const subtitleColor = isVolleyball ? 'text-gray-600' : 'text-gray-300';
  const footerColor = isVolleyball ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={`min-h-screen ${bgColor} py-8`}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className={`text-3xl font-bold ${textColor} mb-2`}>
              Recibo Digital - {academyName}
            </h1>
            <p className={subtitleColor}>
              Recibo #{receiptData.receiptNumber} - {receiptData.studentName}
            </p>
          </div>
          
          {isVolleyball ? (
            <VolleyballReceipt data={receiptData} />
          ) : (
            <DigitalReceipt data={receiptData} />
          )}
          
          <div className={`mt-8 text-center ${footerColor} text-sm`}>
            <p>Este es un recibo digital verificado de {academyName}</p>
            <p>Para cualquier consulta, contacta: 320 565 6520</p>
          </div>
        </div>
      </div>
    </div>
  );
} 