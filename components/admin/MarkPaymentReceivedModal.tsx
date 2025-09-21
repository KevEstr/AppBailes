'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

interface MarkPaymentReceivedModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly payment: {
    id: number;
    student: {
      name: string;
      phone: string;
    };
    expectedAmount: number;
    period: string;
    dueDate: string;
  } | null;
  readonly onSuccess: () => void;
}

export function MarkPaymentReceivedModal({
  isOpen,
  onClose,
  payment,
  onSuccess
}: MarkPaymentReceivedModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receivedAmount, setReceivedAmount] = useState<string>(payment?.expectedAmount.toString() || '');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Actualizar el monto recibido cuando cambie el payment
  useEffect(() => {
    if (payment) {
      setReceivedAmount(payment.expectedAmount.toString());
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payment) return;
    
    if (!paymentMethod) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un método de pago',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/monthly-payments/${payment.id}/mark-received`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod,
          receivedAmount: receivedAmount ? parseFloat(receivedAmount) : undefined,
          notes: notes.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al marcar el pago');
      }

      toast({
        title: 'Éxito',
        description: 'Pago marcado como recibido exitosamente',
        variant: 'default'
      });

      // Reset form
      setPaymentMethod('');
      setReceivedAmount('');
      setNotes('');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error marcando pago:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al marcar el pago',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPaymentMethod('');
      setReceivedAmount('');
      setNotes('');
      onClose();
    }
  };

  if (!payment) return null;

  return (
    <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-600">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Marcar Pago como Recibido
        </DialogTitle>
        <DialogDescription className="text-gray-300">
          Confirma que has recibido el pago de {payment.student.name}
        </DialogDescription>
      </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Estudiante</Label>
            <Input
              value={payment.student.name}
              disabled
              className="bg-gray-700 text-gray-300 border-gray-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Período</Label>
              <Input
                value={payment.period}
                disabled
                className="bg-gray-700 text-gray-300 border-gray-600 font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Monto Esperado</Label>
              <Input
                value={`$${payment.expectedAmount.toLocaleString()}`}
                disabled
                className="bg-gray-700 text-gray-300 border-gray-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receivedAmount" className="text-white">Monto Recibido</Label>
              <Input
                id="receivedAmount"
                type="number"
                placeholder={`${payment.expectedAmount}`}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                min="0"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-white">Método de Pago *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Selecciona el método de pago" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="CASH" className="text-white hover:bg-gray-700">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER" className="text-white hover:bg-gray-700">Transferencia Bancaria</SelectItem>
                  <SelectItem value="CARD" className="text-white hover:bg-gray-700">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-white">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Marcar como Recibido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  );
}
