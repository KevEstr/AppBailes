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
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, User, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WhatsAppMessageTemplateModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly payment: {
    readonly id: number;
    readonly student: {
      readonly id: string;
      readonly name: string;
      readonly phone: string;
    };
    readonly expectedAmount: number;
    readonly period: string;
    readonly dueDate: string | null;
    readonly class?: {
      readonly id: number;
      readonly name: string;
      readonly sport: string;
    } | null;
  } | null;
  readonly periodId: number;
}

export function WhatsAppMessageTemplateModal({
  isOpen,
  onClose,
  payment,
  periodId
}: WhatsAppMessageTemplateModalProps) {
  const [messageTemplate, setMessageTemplate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (payment && isOpen) {
      // Determinar el deporte (DANCE o VOLLEYBALL)
      const sport = payment.class?.sport || 'DANCE';
      const isVolleyball = sport === 'VOLLEYBALL';
      
      // Información de cuenta bancaria según el deporte
      const bankInfo = isVolleyball ? {
        accountNumber: '10135846766',
        accountHolder: 'Mery del Socorro Correa Velásquez',
        documentId: '43429043',
        key: '3128984535',
        whatsapp: '3128984535',
        greeting: 'Hola, no olvides realizar el pago de tu mensualidad de voleibol.🏐🤾‍♀️',
        title: 'Deportista'
      } : {
        accountNumber: '25344586783',
        accountHolder: 'Juliana Cano Ramirez',
        documentId: '1020478821',
        key: '1020478821',
        whatsapp: '3205656520',
        greeting: 'Hola, no olvides realizar el pago de tu mensualidad de baile.🕺💃🏻',
        title: 'Bailarín'
      };

      // Generar el mensaje según el formato especificado
      const message = `${bankInfo.greeting}



📋 Detalles:

* ${bankInfo.title}: ${payment.student.name}

* Valor: $${payment.expectedAmount.toLocaleString()}

* Mensualidad: ${payment.period}

📱 Instrucciones:

1. Realiza el pago por el monto exacto a la siguiente cuenta:

Ahorros Bancolombia ${bankInfo.accountNumber}

${bankInfo.accountHolder}

Cédula ${bankInfo.documentId}

Llave ${bankInfo.key}

2.⁠ ⁠Toma foto del comprobante.

3.⁠ ⁠Envíanos el comprobante al WhatsApp ${bankInfo.whatsapp} o al enlace del final

¿Dudas? ¡Contáctanos!⤵️`;

      setMessageTemplate(message);
    }
  }, [payment, isOpen, periodId]);

  const handleCopy = async () => {
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

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-white">
            Plantilla de Mensaje WhatsApp
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Copia este mensaje para enviarlo manualmente
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

          <div className="space-y-2">
            <label htmlFor="message-template" className="text-sm font-medium text-gray-300">
              Mensaje:
            </label>
            <Textarea
              id="message-template"
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
              onClick={handleCopy}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado
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

