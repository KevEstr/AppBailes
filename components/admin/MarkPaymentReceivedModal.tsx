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
  const [additionalDebt, setAdditionalDebt] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Calcular montos y validaciones
  const baseAmount = payment?.expectedAmount || 0;
  const discountValue = discount ? parseFloat(discount) : 0;
  const additionalDebtValue = additionalDebt ? parseFloat(additionalDebt) : 0;
  const receivedValue = receivedAmount ? parseFloat(receivedAmount) : baseAmount;
  
  // Determinar si se pueden usar descuentos o adeudos
  const canUseDiscount = receivedValue < baseAmount;
  const canUseAdditionalDebt = receivedValue < baseAmount;

  // Actualizar el monto recibido cuando cambie el payment
  useEffect(() => {
    if (payment) {
      setReceivedAmount(payment.expectedAmount.toString());
      setAdditionalDebt('');
      setDiscount('');
    }
  }, [payment]);

  // Limpiar campos cuando no se pueden usar
  useEffect(() => {
    if (!canUseAdditionalDebt && additionalDebt) {
      setAdditionalDebt('');
    }
  }, [canUseAdditionalDebt, additionalDebt]);

  useEffect(() => {
    if (!canUseDiscount && discount) {
      setDiscount('');
    }
  }, [canUseDiscount, discount]);

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

    // Validaciones de montos
    const baseAmount = payment.expectedAmount;
    const discountValue = discount ? parseFloat(discount) : 0;
    const additionalDebtValue = additionalDebt ? parseFloat(additionalDebt) : 0;
    const receivedValue = receivedAmount ? parseFloat(receivedAmount) : baseAmount;

    // Validar que el monto recibido no sea negativo
    if (receivedValue < 0) {
      toast({
        title: 'Error',
        description: 'El monto recibido no puede ser negativo',
        variant: 'destructive'
      });
      return;
    }

    // Validar que el descuento no sea negativo
    if (discountValue < 0) {
      toast({
        title: 'Error',
        description: 'El descuento no puede ser negativo',
        variant: 'destructive'
      });
      return;
    }

    // Validar que el adeudo adicional no sea negativo
    if (additionalDebtValue < 0) {
      toast({
        title: 'Error',
        description: 'El adeudo adicional no puede ser negativo',
        variant: 'destructive'
      });
      return;
    }

    // Validar que los campos solo se usen cuando el monto recibido es menor al esperado
    if (receivedValue >= baseAmount && (discountValue > 0 || additionalDebtValue > 0)) {
      toast({
        title: 'Error',
        description: 'Los campos de descuento y adeudo solo están disponibles cuando el monto recibido es menor al esperado',
        variant: 'destructive'
      });
      return;
    }

    // Validar que si el monto recibido es menor al esperado, debe agregar descuento o adeudo
    if (receivedValue < baseAmount && discountValue === 0 && additionalDebtValue === 0) {
      toast({
        title: 'Error',
        description: 'Si el monto recibido es menor al esperado, debe agregar un descuento o un adeudo para justificar la diferencia',
        variant: 'destructive'
      });
      return;
    }

    // Validar suma: monto recibido + adeudo = monto esperado
    if (additionalDebtValue > 0) {
      const totalWithDebt = receivedValue + additionalDebtValue;
      if (Math.abs(totalWithDebt - baseAmount) > 0.01) { // Tolerancia de 1 centavo
        toast({
          title: 'Error',
          description: `La suma del monto recibido ($${receivedValue.toLocaleString()}) + adeudo ($${additionalDebtValue.toLocaleString()}) = $${totalWithDebt.toLocaleString()}, debe ser igual al monto esperado ($${baseAmount.toLocaleString()})`,
          variant: 'destructive'
        });
        return;
      }
    }

    // Validar suma: monto recibido + descuento = monto esperado
    if (discountValue > 0) {
      const totalWithDiscount = receivedValue + discountValue;
      if (Math.abs(totalWithDiscount - baseAmount) > 0.01) { // Tolerancia de 1 centavo
        toast({
          title: 'Error',
          description: `La suma del monto recibido ($${receivedValue.toLocaleString()}) + descuento ($${discountValue.toLocaleString()}) = $${totalWithDiscount.toLocaleString()}, debe ser igual al monto esperado ($${baseAmount.toLocaleString()})`,
          variant: 'destructive'
        });
        return;
      }
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
          additionalDebt: additionalDebt ? parseFloat(additionalDebt) : undefined,
          discount: discount ? parseFloat(discount) : undefined,
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
      setAdditionalDebt('');
      setDiscount('');
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
      setAdditionalDebt('');
      setDiscount('');
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="additionalDebt" className="text-white">
                Adeudo (opcional)
              </Label>
              <Input
                id="additionalDebt"
                type="number"
                placeholder="0"
                value={additionalDebt}
                onChange={(e) => setAdditionalDebt(e.target.value)}
                min="0"
                step="100"
                disabled={!canUseAdditionalDebt}
                className={`bg-gray-700 border-gray-600 text-white ${!canUseAdditionalDebt ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="text-xs text-gray-400">
              Disponible cuando monto recibido es menor al monto esperado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount" className="text-white">
                Descuento (opcional)
              </Label>
              <Input
                id="discount"
                type="number"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="0"
                step="100"
                disabled={!canUseDiscount}
                className={`bg-gray-700 border-gray-600 text-white ${!canUseDiscount ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="text-xs text-gray-400">
              Disponible cuando monto recibido es menor al monto esperado
              </p>
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
