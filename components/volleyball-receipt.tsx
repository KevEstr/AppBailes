"use client";

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
// Usar <img> para que html2canvas respete tamaño renderizado

interface ReceiptData {
  id: number;
  receiptNumber: string;
  studentName: string;
  amount: number;
  concept: string;
  paymentDate: string;
  nextPaymentDate?: string;
  paymentMethod: string;
  receivedBy: string;
}

interface VolleyballReceiptProps {
  data: ReceiptData;
  isPreview?: boolean;
}

export function VolleyballReceipt({ data, isPreview = false }: VolleyballReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    try {
      if (typeof window === 'undefined' || !receiptRef.current) return;

      const html2canvas = (await import('html2canvas')).default;
      // Esperar fuentes para que no cambien los tamaños al rasterizar
      if (typeof (document as any).fonts?.ready === 'object') {
        await (document as any).fonts.ready;
      }
      const rect = receiptRef.current.getBoundingClientRect();
      // Asegurar carga de imágenes
      const imgs = Array.from(receiptRef.current.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        imgs.map((img) =>
          (img as any).decode?.()
            .catch(() => {})
            .then(() => {}) ||
          (img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }))
        )
      );
      
      // Configuración específica para calidad
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        windowWidth: Math.round(rect.width),
        windowHeight: Math.round(rect.height),
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 0,
      });

      const link = document.createElement('a');
      link.download = `recibo-volleyball-${data.receiptNumber}-${data.studentName.replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast.success('Recibo descargado exitosamente');
    } catch (error) {
      console.error('Error descargando recibo:', error);
      toast.error('Error al descargar el recibo');
    }
  };

  const shareReceipt = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const url = `${window.location.origin}/recibo/${data.id}`;
      
      if (navigator?.share) {
        await navigator.share({
          title: `Recibo ${data.receiptNumber} - Paradise Volleyball Academy`,
          text: `Recibo de pago para ${data.studentName}`,
          url: url,
        });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success('Link del recibo copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error compartiendo recibo:', error);
      toast.error('Error al compartir el recibo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Botones de acción */}
      {!isPreview && (
        <div className="flex gap-3 justify-end">
          <Button 
            onClick={shareReceipt} 
            variant="outline" 
            size="sm"
            className="bg-gradient-to-r from-yellow-500 to-yellow-500 hover:from-yellow-600 hover:to-yellow-500 text-gray-900 border-none shadow-lg font-semibold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir
          </Button>
          <Button 
            onClick={downloadReceipt} 
            variant="outline" 
            size="sm"
            className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-900 hover:to-blue-800 text-white border-none shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PNG
          </Button>
        </div>
      )}

      {/* Contenedor principal con dimensiones fijas */}
      <div className="w-full overflow-x-auto">
        <div 
          ref={receiptRef}
          className="relative bg-white text-gray-900"
          style={{
            width: '800px',
            height: '500px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%, #ffffff 100%)',
          }}
        >
          {/* Bordes decorativos */}
          <div className="absolute top-0 left-0 w-full h-3" style={{ background: 'linear-gradient(90deg, #1e40af 0%, #fbbf24 25%, #60a5fa 50%, #fbbf24 75%, #1e40af 100%)' }} />
          <div className="absolute bottom-0 left-0 w-full h-3" style={{ background: 'linear-gradient(90deg, #1e40af 0%, #fbbf24 25%, #60a5fa 50%, #fbbf24 75%, #1e40af 100%)' }} />
          <div className="absolute top-0 left-0 w-3 h-full" style={{ background: 'linear-gradient(180deg, #1e40af 0%, #fbbf24 25%, #60a5fa 50%, #fbbf24 75%, #1e40af 100%)' }} />
          <div className="absolute top-0 right-0 w-3 h-full" style={{ background: 'linear-gradient(180deg, #1e40af 0%, #fbbf24 25%, #60a5fa 50%, #fbbf24 75%, #1e40af 100%)' }} />

          {/* Contenido del recibo con padding para los bordes */}
          <div className="p-8 h-full">
            {/* Encabezado */}
            <div className="flex justify-between items-start mb-8">
              {/* Logo y datos de la academia */}
              <div className="flex items-start space-x-8">
                <div className="w-[110px] h-[110px] flex items-center justify-center">
                  <img
                    src="/volleyball.png"
                    alt="Paradise Volleyball"
                    width={100}
                    height={100}
                    crossOrigin="anonymous"
                    style={{
                      display: 'block',
                      width: '100px',
                      height: '100px',
                      objectFit: 'contain',
                      border: '4px solid #1e40af',
                      borderRadius: '9999px',
                      boxShadow: '0 0 25px rgba(30,64,175,0.5)'
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-2" style={{ color: '#1e40af' }}>
                    Paradise Volleyball
                  </h1>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>📞 320 565 6520</p>
                    <p>📧 Paradisedanceacademy.pda@gmail.com</p>
                    <p>📱 @Paradise.dance.academy</p>
                  </div>
                </div>
              </div>

              {/* Número de recibo */}
              <div className="text-right">
                <div className="px-6 py-3 rounded-lg" style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  boxShadow: '0 8px 25px rgba(30, 64, 175, 0.3)'
                }}>
                  <div className="text-white font-bold text-sm mb-1">RECIBO #{data.receiptNumber}</div>
                </div>
              </div>
            </div>

            {/* Información del pago - Estructura como en la imagen */}
            <div className="text-center space-y-6">
              {/* Texto principal del recibo */}
              <div className="space-y-2">
                <p className="text-2xl font-bold" style={{ color: '#1e40af' }}>
                  EL SOCIO {data.studentName}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#1e40af' }}>
                  HA SATISFECHO LA CANTIDAD DE ${data.amount.toLocaleString()}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#1e40af' }}>
                  CORRESPONDIENTE A LA FECHA DE {data.paymentDate}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#1e40af' }}>
                  POR CONCEPTO DE MENSUALIDAD
                </p>
              </div>

              {/* Fecha del próximo pago */}
              {data.nextPaymentDate && (
                <div className="mt-8">
                  <div className="inline-block px-6 py-3 rounded-full" style={{
                    background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%)',
                    border: '2px solid #1e40af'
                  }}>
                    <p className="text-lg font-bold" style={{ color: '#1e40af' }}>
                      FECHA DEL PRÓXIMO PAGO {data.nextPaymentDate}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pie del recibo */}
            <div className="absolute bottom-8 left-8 right-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-600">Recibido por:</p>
                  <p className="font-medium text-gray-900">{data.receivedBy}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Recibo verificado por</p>
                  <p className="font-medium text-gray-900">Paradise Volleyball</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
