"use client";

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
// Usar <img> para que html2canvas respete tamaño renderizado sin interferencia de next/image

interface ReceiptData {
  id: number;
  receiptNumber: string;
  studentName: string;
  // studentName ya viene ajustado según mayoría de edad desde el API
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
      // Asegurar que las fuentes estén cargadas para tamaños consistentes
      if (typeof (document as any).fonts?.ready === 'object') {
        await (document as any).fonts.ready;
      }
      const rect = receiptRef.current.getBoundingClientRect();
      // Asegurar que las imágenes estén cargadas (especialmente el logo)
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
        scale: 2, // calidad alta sin distorsionar tipografías
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        windowWidth: Math.round(rect.width),
        windowHeight: Math.round(rect.height),
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 0,
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
                <div className="w-[110px] h-[110px] flex items-center justify-center">
                  <img
                    src="/logo.jpg"
                    alt="Paradise Dance Academy"
                    width={100}
                    height={100}
                    crossOrigin="anonymous"
                    style={{
                      display: 'block',
                      width: '100px',
                      height: '100px',
                      objectFit: 'contain',
                      border: '4px solid #00d4ff',
                      borderRadius: '9999px',
                      boxShadow: '0 0 25px rgba(0,212,255,0.5)'
                    }}
                  />
                </div>
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
                  <div className="text-white font-bold text-sm mb-1">RECIBO #{data.receiptNumber}</div>
                </div>
              </div>
            </div>

            {/* Información del pago - Estructura como en la imagen */}
            <div className="text-center space-y-4">
              {/* Texto principal del recibo */}
              <div className="space-y-2">
                <p className="text-2xl font-bold" style={{ color: '#00d4ff' }}>
                  EL SOCIO {data.studentName}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#00d4ff' }}>
                  HA SATISFECHO LA CANTIDAD DE ${data.amount.toLocaleString()}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#00d4ff' }}>
                  CORRESPONDIENTE A LA FECHA DE {data.paymentDate}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#00d4ff' }}>
                  POR CONCEPTO DE MENSUALIDAD
                </p>
              </div>

              {/* Fecha del próximo pago */}
              {data.nextPaymentDate && (
                <div className="mt-8">
                  <div className="inline-block px-6 py-3 rounded-full" style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(255, 204, 0, 0.2) 100%)',
                    border: '2px solid #00d4ff'
                  }}>
                    <p className="text-lg font-bold" style={{ color: '#00d4ff' }}>
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