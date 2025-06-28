'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  Calendar,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentProof {
  id: number;
  payerName: string;
  payerPhone?: string;
  payerEmail?: string;
  amount: number;
  paymentMethod: string;
  proofImageUrl: string;
  uploadedAt: Date;
  status: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  paymentForm: {
    studentName: string;
    amount: number;
    period: {
      name: string;
      dueDate: Date;
    };
    monthlyPayment: {
      id: number;
      expectedAmount: number;
      status: string;
    };
  };
}

export function PaymentProofReview() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadPendingProofs();
  }, []);

  const loadPendingProofs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payment-proofs/pending');
      
      if (!response.ok) {
        throw new Error('Error al cargar comprobantes');
      }
      
      const data = await response.json();
      setProofs(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedProof) return;

    try {
      setReviewing(true);
      
      const reviewData = {
        status: reviewAction,
        reviewedBy: 'admin@academia.com', // En producción, obtener del usuario logueado
        reviewNotes: reviewNotes.trim() || undefined,
        approvedAmount: reviewAction === 'APPROVED' && approvedAmount 
          ? parseFloat(approvedAmount) 
          : undefined
      };

      const response = await fetch(`/api/admin/payment-proofs/${selectedProof.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      if (!response.ok) {
        throw new Error('Error al revisar comprobante');
      }

      // Recargar lista
      await loadPendingProofs();
      
      // Limpiar formulario
      setSelectedProof(null);
      setReviewNotes('');
      setApprovedAmount('');
      setReviewAction('APPROVED');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: 'Pendiente', icon: Clock, className: 'bg-yellow-900/50 text-yellow-300 border-yellow-600' },
      APPROVED: { label: 'Aprobado', icon: CheckCircle, className: 'bg-green-900/50 text-green-300 border-green-600' },
      REJECTED: { label: 'Rechazado', icon: XCircle, className: 'bg-red-900/50 text-red-300 border-red-600' },
      NEEDS_REVIEW: { label: 'Revisar', icon: Eye, className: 'bg-blue-900/50 text-blue-300 border-blue-600' }
    };

    const { label, icon: Icon, className } = config[status as keyof typeof config] || config.PENDING;

    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      TRANSFER: 'Transferencia',
      CASH: 'Efectivo',
      CARD: 'Tarjeta'
    };
    return methods[method as keyof typeof methods] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-300">
            {proofs.length} comprobantes pendientes de revisión
          </p>
        </div>
        <Button 
          onClick={loadPendingProofs} 
          variant="outline"
          className="bg-gray-800/90 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
        >
          Actualizar
        </Button>
      </div>

      {proofs.length === 0 ? (
        <Card className="bg-gray-800/90 border-gray-600">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">¡Todo al día!</h3>
            <p className="text-gray-400">
              No hay comprobantes pendientes de revisión.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {proofs.map((proof) => (
            <Card key={proof.id} className="overflow-hidden bg-gray-800/90 border-gray-600">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-white">
                      {proof.paymentForm.studentName}
                    </CardTitle>
                    <p className="text-sm text-gray-400">
                      {proof.paymentForm.period.name}
                    </p>
                  </div>
                  {getStatusBadge(proof.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Información del pago */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-white">Información del pago</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{proof.payerName}</span>
                      </div>
                      
                      {proof.payerPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">{proof.payerPhone}</span>
                        </div>
                      )}
                      
                      {proof.payerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">{proof.payerEmail}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{formatCurrency(proof.amount)}</span>
                        <span className="text-gray-500">
                          (esperado: {formatCurrency(proof.paymentForm.monthlyPayment.expectedAmount)})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{getPaymentMethodLabel(proof.paymentMethod)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">Subido el {new Date(proof.uploadedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comprobante */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-white">Comprobante</h4>
                    
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <img 
                        src={proof.proofImageUrl} 
                        alt="Comprobante de pago"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(proof.proofImageUrl, '_blank')}
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                      onClick={() => window.open(proof.proofImageUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver comprobante completo
                    </Button>
                  </div>

                  {/* Acciones de revisión */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-white">Acciones</h4>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full"
                          onClick={() => {
                            setSelectedProof(proof);
                            setApprovedAmount(proof.amount.toString());
                          }}
                        >
                          Revisar comprobante
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="max-w-md bg-gray-800 border-gray-600">
                        <DialogHeader>
                          <DialogTitle className="text-white">Revisar Comprobante</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-gray-300">Decisión</Label>
                            <Select value={reviewAction} onValueChange={(value: any) => setReviewAction(value)}>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-700 border-gray-600">
                                <SelectItem value="APPROVED" className="text-white hover:bg-gray-600">Aprobar pago</SelectItem>
                                <SelectItem value="REJECTED" className="text-white hover:bg-gray-600">Rechazar</SelectItem>
                                <SelectItem value="NEEDS_REVIEW" className="text-white hover:bg-gray-600">Necesita más revisión</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {reviewAction === 'APPROVED' && (
                            <div>
                              <Label className="text-gray-300">Monto aprobado</Label>
                              <Input
                                type="number"
                                value={approvedAmount}
                                onChange={(e) => setApprovedAmount(e.target.value)}
                                placeholder="Monto a aprobar"
                                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                              />
                            </div>
                          )}

                          <div>
                            <Label className="text-gray-300">Notas {reviewAction === 'REJECTED' ? '(requerido)' : '(opcional)'}</Label>
                            <Textarea
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Notas sobre la revisión..."
                              rows={3}
                              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={handleReview}
                              disabled={reviewing || (reviewAction === 'REJECTED' && !reviewNotes.trim())}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              {reviewing ? 'Procesando...' : 'Confirmar'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Botones rápidos */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-400 border-green-600 bg-green-900/20 hover:bg-green-800/30"
                        onClick={async () => {
                          setSelectedProof(proof);
                          setReviewAction('APPROVED');
                          setApprovedAmount(proof.amount.toString());
                          setReviewNotes('Aprobado automáticamente');
                          
                          // Ejecutar revisión inmediatamente
                          try {
                            setReviewing(true);
                            
                            const reviewData = {
                              status: 'APPROVED',
                              reviewedBy: 'admin@academia.com',
                              reviewNotes: 'Aprobado automáticamente',
                              approvedAmount: proof.amount
                            };

                            const response = await fetch(`/api/admin/payment-proofs/${proof.id}/review`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(reviewData)
                            });

                            if (!response.ok) {
                              throw new Error('Error al revisar comprobante');
                            }

                            // Recargar lista
                            await loadPendingProofs();
                            
                            // Limpiar formulario
                            setSelectedProof(null);
                            setReviewNotes('');
                            setApprovedAmount('');
                            setReviewAction('APPROVED');
                          } catch (error) {
                            console.error('Error:', error);
                          } finally {
                            setReviewing(false);
                          }
                        }}
                        disabled={reviewing}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-600 bg-red-900/20 hover:bg-red-800/30"
                        onClick={() => {
                          setSelectedProof(proof);
                          setReviewAction('REJECTED');
                          setReviewNotes('Requiere más información');
                          setApprovedAmount('');
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 