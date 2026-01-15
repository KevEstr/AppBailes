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
import { ReceiptTemplateModal } from './ReceiptTemplateModal';

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
    dueDate: string | null;
  } | null;
  readonly onSuccess: () => void;
  readonly onReceiptGenerated?: (data: {
    payment: {
      id: number;
      student: {
        name: string;
        phone: string;
      };
      expectedAmount: number;
      period: string;
      class?: {
        id: number;
        name: string;
        sport: string;
      } | null;
    };
    receiptId: number;
    receivedAmount: number;
    paymentMethod: string;
    isPartialPayment: boolean;
    remainingAmount: number;
    nextPaymentDate?: string;
  }) => void;
}

export function MarkPaymentReceivedModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
  onReceiptGenerated
}: MarkPaymentReceivedModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receivedAmount, setReceivedAmount] = useState<string>(payment?.expectedAmount.toString() || '');
  const [additionalDebt, setAdditionalDebt] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para el modal de recibo
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receivedAmount: number;
    paymentMethod: string;
    isPartialPayment: boolean;
    remainingAmount: number;
    nextPaymentDate?: string;
  } | null>(null);
  
  // Estados para pago adicional
  const [hasAdditionalPayment, setHasAdditionalPayment] = useState<boolean>(false);
  const [additionalPaymentType, setAdditionalPaymentType] = useState<string>('');
  const [additionalPaymentAmount, setAdditionalPaymentAmount] = useState<string>('');
  const [additionalPaymentMethod, setAdditionalPaymentMethod] = useState<string>('');

  // Calcular montos y validaciones
  const baseAmount = payment?.expectedAmount || 0;
  const discountValue = discount ? Number.parseFloat(discount) : 0;
  const additionalDebtValue = additionalDebt ? Number.parseFloat(additionalDebt) : 0;
  const receivedValue = receivedAmount ? Number.parseFloat(receivedAmount) : baseAmount;
  
  // Determinar si se pueden usar descuentos o adeudos
  const canUseDiscount = receivedValue < baseAmount;
  const canUseAdditionalDebt = receivedValue < baseAmount;

  // Actualizar el monto recibido cuando cambie el payment
  useEffect(() => {
    if (payment) {
      setReceivedAmount(payment.expectedAmount.toString());
      setAdditionalDebt('');
      setDiscount('');
      setHasAdditionalPayment(false);
      setAdditionalPaymentType('');
      setAdditionalPaymentAmount('');
      setAdditionalPaymentMethod('');
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
    const discountValue = discount ? Number.parseFloat(discount) : 0;
    const additionalDebtValue = additionalDebt ? Number.parseFloat(additionalDebt) : 0;
    const receivedValue = receivedAmount ? Number.parseFloat(receivedAmount) : baseAmount;

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

    // Validar pago adicional si está habilitado
    if (hasAdditionalPayment) {
      if (!additionalPaymentType) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona el tipo de pago adicional',
          variant: 'destructive'
        });
        return;
      }

      if (!additionalPaymentAmount || Number.parseFloat(additionalPaymentAmount) <= 0) {
        toast({
          title: 'Error',
          description: 'El monto del pago adicional debe ser mayor a 0',
          variant: 'destructive'
        });
        return;
      }

      if (!additionalPaymentMethod) {
        toast({
          title: 'Error',
          description: 'Selecciona el método de pago para la inscripción',
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
          receivedAmount: receivedAmount ? Number.parseFloat(receivedAmount) : undefined,
          additionalDebt: additionalDebt ? Number.parseFloat(additionalDebt) : undefined,
          discount: discount ? Number.parseFloat(discount) : undefined,
          additionalPayment: hasAdditionalPayment ? {
            type: additionalPaymentType,
            amount: Number.parseFloat(additionalPaymentAmount),
            paymentMethod: additionalPaymentMethod
          } : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al marcar el pago');
      }

      // Calcular si es pago parcial
      const receivedValue = receivedAmount ? Number.parseFloat(receivedAmount) : baseAmount;
      const discountValue = discount ? Number.parseFloat(discount) : 0;
      const effectiveExpectedAmount = baseAmount - discountValue;
      const isPartialPayment = receivedValue < effectiveExpectedAmount;
      const remainingAmount = isPartialPayment ? effectiveExpectedAmount - receivedValue : 0;

      // Guardar datos para el modal de recibo
      if (data.receiptId) {
        // Reset form
        setPaymentMethod('');
        setReceivedAmount('');
        setAdditionalDebt('');
        setDiscount('');
        setHasAdditionalPayment(false);
        setAdditionalPaymentType('');
        setAdditionalPaymentAmount('');
        setAdditionalPaymentMethod('');
        
        // Si hay callback, usarlo para mostrar el modal en el componente padre
        if (onReceiptGenerated && payment) {
          onReceiptGenerated({
            payment: {
              id: payment.id,
              student: {
                name: payment.student.name,
                phone: payment.student.phone,
              },
              expectedAmount: payment.expectedAmount,
              period: data.periodName || payment.period, // Usar el período calculado si está disponible
              class: null, // Se puede obtener del payment si está disponible
            },
            receiptId: data.receiptId,
            receivedAmount: receivedValue,
            paymentMethod: paymentMethod,
            isPartialPayment: isPartialPayment,
            remainingAmount: remainingAmount,
            nextPaymentDate: data.nextPaymentDate || undefined,
          });
        } else {
          // Fallback: mostrar modal interno (comportamiento anterior)
          setReceiptId(data.receiptId);
          setReceiptData({
            receivedAmount: receivedValue,
            paymentMethod: paymentMethod,
            isPartialPayment: isPartialPayment,
            remainingAmount: remainingAmount,
            nextPaymentDate: undefined
          });
          setShowReceiptModal(true);
        }
      } else {
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
      setHasAdditionalPayment(false);
      setAdditionalPaymentType('');
      setAdditionalPaymentAmount('');
        setAdditionalPaymentMethod('');
      
      onSuccess();
      onClose();
      }
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
      setHasAdditionalPayment(false);
      setAdditionalPaymentType('');
      setAdditionalPaymentAmount('');
      onClose();
    }
  };

  if (!payment) return null;

  return (
    <>
    <DialogContent className="sm:max-w-[800px] bg-gray-800 border-gray-600">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Marcar Pago como Recibido
        </DialogTitle>
        <DialogDescription className="text-gray-300">
          Confirma que has recibido el pago de {payment.student.name}
        </DialogDescription>
      </DialogHeader>

        {!showReceiptModal && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Estudiante</Label>
            <Input
              value={payment.student.name}
              disabled
              className="bg-gray-700 text-gray-300 border-gray-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
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
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                className={`bg-gray-700 border-gray-600 text-white ${canUseAdditionalDebt ? '' : 'opacity-50 cursor-not-allowed'}`}
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
                className={`bg-gray-700 border-gray-600 text-white ${canUseDiscount ? '' : 'opacity-50 cursor-not-allowed'}`}
              />
              <p className="text-xs text-gray-400">
              Disponible cuando monto recibido es menor al monto esperado
              </p>
            </div>
          </div>

          {/* Sección de Pago Adicional */}
          <div className="space-y-4 border-t border-gray-600 pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasAdditionalPayment"
                checked={hasAdditionalPayment}
                onChange={(e) => setHasAdditionalPayment(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500"
              />
              <Label htmlFor="hasAdditionalPayment" className="text-white font-medium">
                Incluir pago adicional (ej: inscripción)
              </Label>
            </div>

            {hasAdditionalPayment && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-600">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="additionalPaymentType" className="text-white">Tipo de Pago</Label>
                    <Select value={additionalPaymentType} onValueChange={setAdditionalPaymentType}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="ENROLLMENT" className="text-white hover:bg-gray-700">Inscripción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalPaymentAmount" className="text-white">Monto</Label>
                    <Input
                      id="additionalPaymentAmount"
                      type="number"
                      placeholder="0"
                      value={additionalPaymentAmount}
                      onChange={(e) => setAdditionalPaymentAmount(e.target.value)}
                      min="0"
                      step="1000"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalPaymentMethod" className="text-white">Método de Pago (inscripción)</Label>
                    <Select value={additionalPaymentMethod} onValueChange={setAdditionalPaymentMethod}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Selecciona el método" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="CASH" className="text-white hover:bg-gray-700">Efectivo</SelectItem>
                        <SelectItem value="TRANSFER" className="text-white hover:bg-gray-700">Transferencia</SelectItem>
                        <SelectItem value="CARD" className="text-white hover:bg-gray-700">Tarjeta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-200 text-sm">
                    <strong>Nota:</strong> El pago adicional se procesará junto con el pago mensual y se incluirá en el mismo recibo.
                  </p>
                </div>
              </div>
            )}
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
        )}
      </DialogContent>
      
      {/* Modal de plantilla de recibo - renderizado fuera del DialogContent para evitar conflictos */}
      {payment && receiptData && receiptId && (
        <ReceiptTemplateModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptId(null);
            setReceiptData(null);
            // Cerrar el modal principal y recargar la lista
            onClose();
            onSuccess();
          }}
          payment={{
            id: payment.id,
            student: {
              name: payment.student.name,
              phone: payment.student.phone,
            },
            expectedAmount: payment.expectedAmount,
            period: payment.period,
            class: null, // Se puede obtener del payment si está disponible
          }}
          receiptId={receiptId}
          receivedAmount={receiptData.receivedAmount}
          paymentMethod={receiptData.paymentMethod}
          isPartialPayment={receiptData.isPartialPayment}
          remainingAmount={receiptData.remainingAmount}
          nextPaymentDate={receiptData.nextPaymentDate}
        />
      )}
    </>
  );
}
