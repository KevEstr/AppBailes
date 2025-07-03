"use client";

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') return;
      
      const element = receiptRef.current;
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: 500,
      });

      const link = document.createElement('a');
      link.download = `recibo-${data.receiptNumber}-${data.studentName.replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Recibo descargado exitosamente');
    } catch (error) {
      console.error('Error descargando recibo:', error);
      toast.error('Error al descargar el recibo');
    }
  };

  const shareReceipt = async () => {
    try {
      // Verificar que estamos en el cliente
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

      <Card className="overflow-hidden shadow-2xl border-gray-700">
        <CardContent className="p-0">
          <div
            ref={receiptRef}
            className="relative text-white overflow-hidden"
            style={{
              width: '800px',
              height: '500px',
              fontFamily: 'Arial, sans-serif',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0a0a0a 100%)'
            }}
          >
            {/* === BORDES DECORATIVOS UNIFORMES === */}
            
            {/* Borde superior con gradiente */}
            <div 
              className="absolute top-0 left-0 w-full h-3"
              style={{
                background: 'linear-gradient(90deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)',
              }}
            />
            
            {/* Borde inferior con gradiente */}
            <div 
              className="absolute bottom-0 left-0 w-full h-3"
              style={{
                background: 'linear-gradient(90deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)',
              }}
            />

            {/* Borde izquierdo */}
            <div 
              className="absolute top-0 left-0 w-3 h-full"
              style={{
                background: 'linear-gradient(180deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)',
              }}
            />

            {/* Borde derecho */}
            <div 
              className="absolute top-0 right-0 w-3 h-full"
              style={{
                background: 'linear-gradient(180deg, #00d4ff 0%, #0099cc 25%, #ffcc00 50%, #0099cc 75%, #00d4ff 100%)',
              }}
            />

            {/* === EFECTOS DE FONDO DECORATIVOS === */}
            
            {/* Efectos de luz en esquinas */}
            <div 
              className="absolute top-0 left-0 w-32 h-32 opacity-20"
              style={{
                background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
              }}
            />
            <div 
              className="absolute top-0 right-0 w-32 h-32 opacity-20"
              style={{
                background: 'radial-gradient(circle, #ffcc00 0%, transparent 70%)',
              }}
            />
            <div 
              className="absolute bottom-0 left-0 w-32 h-32 opacity-20"
              style={{
                background: 'radial-gradient(circle, #ffcc00 0%, transparent 70%)',
              }}
            />
            <div 
              className="absolute bottom-0 right-0 w-32 h-32 opacity-20"
              style={{
                background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
              }}
            />

            {/* === CONTENIDO PRINCIPAL === */}
            <div className="relative z-10 h-full flex flex-col p-8">
              
              {/* === HEADER SUPERIOR === */}
              <div className="flex justify-between items-start mb-8">
                
                {/* Logo y título */}
                <div className="flex items-start space-x-16">
                  {/* Logo real de Paradise Dance Academy */}
                  <div className="relative flex-shrink-0 mt-2">
                    <div 
                      className="relative overflow-hidden rounded-full border-4 shadow-2xl"
                      style={{
                        width: '110px',
                        height: '110px',
                        borderColor: '#00d4ff',
                        boxShadow: '0 0 25px rgba(0, 212, 255, 0.5), inset 0 0 15px rgba(0, 212, 255, 0.2)'
                      }}
                    >
                      <Image
                        src="/logo.jpg"
                        alt="Paradise Dance Academy"
                        width={110}
                        height={110}
                        className="object-cover w-full h-full"
                        style={{ filter: 'brightness(1.1) contrast(1.1)' }}
                      />
                    </div>
                    
                    {/* Efecto glow alrededor del logo */}
                    <div 
                      className="absolute inset-0 rounded-full opacity-30"
                      style={{
                        background: 'radial-gradient(circle, transparent 40%, #00d4ff 50%, transparent 60%)',
                        filter: 'blur(8px)',
                        transform: 'scale(1.2)'
                      }}
                    />
                  </div>

                  {/* Información de la academia */}
                  <div className="flex-1 ml-4">
                    <h1 
                      className="font-black mb-2 leading-tight"
                      style={{
                        fontSize: '30px',
                        background: 'linear-gradient(135deg, #00d4ff 0%, #ffcc00 50%, #00d4ff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase'
                      }}
                    >
                      Paradise Dance Academy
                    </h1>
                    
                    {/* Información de contacto profesional */}
                    <div className="space-y-1 mt-1">
                      <div className="flex items-center text-cyan-300">
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center mr-2 text-xs"
                          style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}
                        >
                          📞
                        </div>
                        <span className="font-medium text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                          320 565 6520
                        </span>
                      </div>
                      <div className="flex items-center text-cyan-300">
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center mr-2 text-xs"
                          style={{ background: 'linear-gradient(135deg, #ffcc00, #ff9900)' }}
                        >
                          📧
                        </div>
                        <span className="font-medium text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                          Paradisedanceacademy.pda@gmail.com
                        </span>
                      </div>
                      <div className="flex items-center text-cyan-300">
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center mr-2 text-xs"
                          style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}
                        >
                          📱
                        </div>
                        <span className="font-medium text-xs" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                          @Paradise.dance.academy
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Número de recibo elegante */}
                <div className="text-right">
                  <div 
                    className="px-6 py-3 rounded-lg mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                      boxShadow: '0 8px 25px rgba(0, 212, 255, 0.3)'
                    }}
                  >
                    <div className="text-white font-bold text-sm mb-1">RECIBO DIGITAL</div>
                    <div 
                      className="text-white font-black text-3xl"
                      style={{
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        letterSpacing: '2px'
                      }}
                    >
                      #{data.receiptNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* === SECCIÓN PRINCIPAL - INFORMACIÓN DEL PAGO === */}
              <div className="flex-1 flex justify-between mb-8 px-8">
                
                {/* Columna izquierda - Información del estudiante */}
                <div className="w-80 mr-8">
                  
                  {/* Información del socio */}
                  <div 
                    className="p-6 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(255, 204, 0, 0.1) 100%)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      boxShadow: '0 4px 15px rgba(0, 212, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}
                      >
                        👤
                      </div>
                      <span 
                        className="font-bold text-xl"
                        style={{
                          color: '#00d4ff',
                          textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                          letterSpacing: '1px'
                        }}
                      >
                        INFORMACIÓN DEL SOCIO
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-300 text-sm font-medium">Nombre:</span>
                        <div 
                          className="text-white text-xl font-bold mt-1"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {data.studentName}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-300 text-sm font-medium">Concepto:</span>
                        <div 
                          className="text-cyan-300 text-lg font-semibold mt-1"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {data.concept}
                        </div>
                      </div>
                    </div>
                  </div>


                </div>

                {/* Columna derecha - Monto y próximo pago */}
                <div className="w-80 ml-8">
                  
                  {/* Monto pagado - DESTACADO */}
                  <div 
                    className="text-center p-6 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 50%, #ffcc00 100%)',
                      boxShadow: '0 10px 30px rgba(0, 212, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    <div className="text-white text-sm font-bold mb-2 uppercase tracking-wider">
                      Monto Pagado
                    </div>
                    <div 
                      className="text-white font-black mb-2"
                      style={{
                        fontSize: '42px',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
                        letterSpacing: '2px'
                      }}
                    >
                      ${data.amount.toLocaleString()}
                    </div>
                    <div className="text-blue-100 text-sm font-medium">
                      Pago recibido exitosamente
                    </div>
                  </div>


                </div>
              </div>

              {/* === FOOTER - COPYRIGHT === */}
              <div className="flex justify-end items-end">
                <div className="text-right text-xs text-gray-400">
                  <div>Recibo digital verificado</div>
                  <div>Paradise Dance Academy © 2025</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 