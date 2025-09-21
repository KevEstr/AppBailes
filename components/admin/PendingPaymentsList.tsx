'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertCircle, 
  CheckCircle, 
  MessageSquare, 
  Search,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MarkPaymentReceivedModal } from './MarkPaymentReceivedModal';

interface PendingPayment {
  id: number;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  expectedAmount: number;
  status: string;
  period: string;
  dueDate: string;
  isOverdue: boolean;
  createdAt: string;
}

interface PendingPaymentsListProps {
  periodId: number;
}

export function PendingPaymentsList({ periodId }: PendingPaymentsListProps) {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchPayments = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodId: periodId.toString(),
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/admin/monthly-payments/pending?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar pagos');
      }

      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cargar pagos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [periodId]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchPayments(1, value);
  };

  const handleMarkAsReceived = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setShowMarkModal(true);
  };

  const handlePaymentMarked = () => {
    fetchPayments(pagination.page, searchTerm);
    setShowMarkModal(false);
    setSelectedPayment(null);
  };

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      const response = await fetch('/api/admin/send-pending-payment-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId,
          studentIds: payments.map(p => p.student.id)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar mensajes');
      }

      toast({
        title: 'Mensajes Enviados',
        description: `Enviados: ${data.sentCount}, Fallidos: ${data.failedCount}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al enviar mensajes',
        variant: 'destructive'
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const getStatusBadge = (payment: PendingPayment) => {
    if (payment.isOverdue) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando pagos pendientes...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Pagos Pendientes
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleSendWhatsApp}
                disabled={sendingWhatsApp || payments.length === 0}
                variant="outline"
                size="sm"
              >
                {sendingWhatsApp ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Enviar WhatsApp
              </Button>
              <Button
                onClick={() => fetchPayments(pagination.page, searchTerm)}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, documento o teléfono..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay pagos pendientes para este período
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estudiante</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Límite</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.student.name}
                          </TableCell>
                          <TableCell>{payment.student.phone}</TableCell>
                          <TableCell>
                            ${payment.expectedAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment)}
                          </TableCell>
                          <TableCell>
                            {formatDate(payment.dueDate)}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleMarkAsReceived(payment)}
                              size="sm"
                              variant="outline"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar Recibido
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.totalCount)} de{' '}
                      {pagination.totalCount} pagos
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPayments(pagination.page - 1, searchTerm)}
                        disabled={!pagination.hasPrev}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPayments(pagination.page + 1, searchTerm)}
                        disabled={!pagination.hasNext}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <MarkPaymentReceivedModal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        payment={selectedPayment}
        onSuccess={handlePaymentMarked}
      />
    </div>
  );
}
