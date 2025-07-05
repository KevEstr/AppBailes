"use client";

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

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

interface DigitalReceiptProps {
  data: ReceiptData;
  isPreview?: boolean;
}

export function DigitalReceipt({ data, isPreview = false }: DigitalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    try {
      if (typeof window === 'undefined' || !receiptRef.current) return;

      const html2canvas = (await import('html2canvas')).default;
      
      // Configuración específica para calidad
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3, // Alta calidad
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        windowWidth: 800,
        windowHeight: 500,
        width: 800,
        height: 500,
      });

      const link = document.createElement('a');
      link.download = `recibo-${data.receiptNumber}-${data.studentName.replace(/\s/g, '-')}.png`;
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
          title: `Recibo ${data.receiptNumber} - Paradise Dance Academy`,
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
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-none shadow-lg"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir
          </Button>
          <Button 
            onClick={downloadReceipt} 
            variant="outline" 
            size="sm"
            className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white border-none shadow-lg"
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
          className="relative bg-[#0a0a0a] text-white"
          style={{
            width: '800px',
            height: '500px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0a0a0a 100%)',
          }}
        >
          {/* Bordes decorativos */}
          <div className="absolute top-0 left-0 w-full h-3" style={{ background: 'linear-gradient(90deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)' }} />
          <div className="absolute bottom-0 left-0 w-full h-3" style={{ background: 'linear-gradient(90deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)' }} />
          <div className="absolute top-0 left-0 w-3 h-full" style={{ background: 'linear-gradient(180deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)' }} />
          <div className="absolute top-0 right-0 w-3 h-full" style={{ background: 'linear-gradient(180deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)' }} />

          {/* Contenido del recibo con padding para los bordes */}
          <div className="p-8 h-full">
            {/* Encabezado */}
            <div className="flex justify-between items-start mb-8">
              {/* Logo y datos de la academia */}
              <div className="flex items-start space-x-8">
                <Image
                  src="/logo.jpg"
                  alt="Paradise Dance Academy"
                  width={110}
                  height={110}
                  className="rounded-full shadow-[0_0_25px_rgba(0,212,255,0.5)]"
                  style={{
                    border: '4px solid #00d4ff',
                  }}
                />
                <div>
                  <h1 className="text-2xl font-bold mb-2" style={{ color: '#00d4ff' }}>
                    Paradise Dance Academy
                  </h1>
                  <div className="space-y-1 text-sm">
                    <p>📞 320 565 6520</p>
                    <p>📧 Paradisedanceacademy.pda@gmail.com</p>
                    <p>📱 @Paradise.dance.academy</p>
                  </div>
                </div>
              </div>

              {/* Número de recibo */}
              <div className="text-right">
                <div className="px-6 py-3 rounded-lg" style={{
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  boxShadow: '0 8px 25px rgba(0, 212, 255, 0.3)'
                }}>
                  <div className="text-white font-bold text-sm mb-1">RECIBO DIGITAL</div>
                  <div className="text-white font-black text-2xl" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    #{data.receiptNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Información del pago */}
            <div className="grid grid-cols-2 gap-8">
              {/* Datos del estudiante */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(255, 204, 0, 0.1) 100%)',
                  border: '1px solid rgba(0, 212, 255, 0.3)'
                }}>
                  <h2 className="text-lg font-bold mb-2" style={{ color: '#00d4ff' }}>Información del Estudiante</h2>
                  <p className="text-xl font-bold text-white mb-2">{data.studentName}</p>
                  <p className="text-cyan-300">{data.concept}</p>
                </div>
              </div>

              {/* Detalles del pago */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{
                  background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%)',
                  border: '1px solid rgba(255, 204, 0, 0.3)'
                }}>
                  <h2 className="text-lg font-bold mb-2" style={{ color: '#ffcc00' }}>Detalles del Pago</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monto:</span>
                      <span className="font-bold">${data.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha:</span>
                      <span>{data.paymentDate}</span>
                    </div>
                    {data.nextPaymentDate && (
                      <div className="flex justify-between text-orange-300">
                        <span>Próximo pago:</span>
                        <span>{data.nextPaymentDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del recibo */}
            <div className="absolute bottom-8 left-8 right-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-400">Recibido por:</p>
                  <p className="font-medium">{data.receivedBy}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Recibo verificado por</p>
                  <p className="font-medium">Paradise Dance Academy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 