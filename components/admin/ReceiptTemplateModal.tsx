'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, User, Phone, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReceiptTemplateModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly payment: {
    readonly id: number;
    readonly student: {
      readonly name: string;
      readonly phone: string;
    };
    readonly expectedAmount: number;
    readonly period: string;
    readonly class?: {
      readonly sport: string;
    } | null;
  } | null;
  readonly receiptId: number | null;
  readonly receivedAmount: number;
  readonly paymentMethod: string;
  readonly isPartialPayment?: boolean;
  readonly remainingAmount?: number;
  readonly nextPaymentDate?: string;
}

export function ReceiptTemplateModal({
  isOpen,
  onClose,
  payment,
  receiptId,
  receivedAmount,
  paymentMethod,
  isPartialPayment = false,
  remainingAmount = 0,
  nextPaymentDate
}: ReceiptTemplateModalProps) {
  const [messageTemplate, setMessageTemplate] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');

  useEffect(() => {
    if (payment && isOpen && receiptId) {
      // Generar URL del recibo
      const baseUrl = globalThis.location?.origin || '';
      const url = `${baseUrl}/recibo/${receiptId}`;
      setReceiptUrl(url);

      // Etiquetas de método de pago
      const paymentMethodLabels: Record<string, string> = {
        TRANSFER: "Transferencia",
        CASH: "Efectivo",
        CARD: "Tarjeta",
        OTHER: "Otro",
      };

      const methodLabel = paymentMethodLabels[paymentMethod] || paymentMethod;

      // Generar el mensaje según el formato especificado
      const nextPaymentText = nextPaymentDate 
        ? `tu próximo pago es el ${nextPaymentDate}`
        : 'tu próximo pago será confirmado próximamente';

      const message = `¡Hola! Te informamos que tu comprobante de pago ha sido aprobado.

Estudiante: ${payment.student.name}
Mensualidad: ${payment.period}
Monto: $${receivedAmount.toLocaleString()}
Método: ${methodLabel}
Estado: Pago confirmado
¡Perfecto! El pago ha sido registrado exitosamente en nuestro sistema ${nextPaymentText}  

📄 Tu recibo digital:

${url}

💡 Puedes descargarlo o compartirlo desde este enlace

¡Gracias por ser parte de nuestra familia!`;

      setMessageTemplate(message);
    }
  }, [payment, isOpen, receiptId, receivedAmount, paymentMethod, isPartialPayment, remainingAmount, nextPaymentDate]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageTemplate);
      setCopied(true);
      toast({
        title: "Mensaje copiado",
        description: "El mensaje ha sido copiado al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying message:', error);
      toast({
        title: "Error",
        description: "No se pudo copiar el mensaje",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setLinkCopied(true);
      toast({
        title: "Link copiado",
        description: "El link del recibo ha sido copiado al portapapeles",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Error",
        description: "No se pudo copiar el link",
        variant: "destructive",
      });
    }
  };

  if (!payment || !receiptId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-white">
            Plantilla de Mensaje de Recibo
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Copia el mensaje y el link del recibo para enviarlo manualmente
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Información del destinatario */}
          <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Información del Destinatario:</h4>
            <div className="flex items-center gap-2 text-white">
              <User className="h-4 w-4 text-blue-400" />
              <span className="font-medium">{payment.student.name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Phone className="h-4 w-4 text-green-400" />
              <span>{payment.student.phone}</span>
            </div>
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <label htmlFor="receipt-message" className="text-sm font-medium text-gray-300">
              Mensaje:
            </label>
            <Textarea
              id="receipt-message"
              value={messageTemplate}
              readOnly
              className="bg-gray-700 border-gray-600 text-white min-h-[300px] font-mono text-sm"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cerrar
            </Button>
            <Button
              onClick={handleCopyMessage}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mensaje Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mensaje
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

