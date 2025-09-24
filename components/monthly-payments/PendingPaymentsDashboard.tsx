'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AdvancedPagination } from '@/components/ui/advanced-pagination';
import { 
  Dialog
} from '@/components/ui/dialog';
import { 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MessageSquare,
  Copy,
  X,
  Filter
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MarkPaymentReceivedModal } from '@/components/admin/MarkPaymentReceivedModal';
import { toast } from '@/hooks/use-toast';

interface PendingPayment {
  id: number;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  expectedAmount: number;
  paidAmount?: number | null;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL_PAID';
  period: string;
  dueDate: string;
  isOverdue: boolean;
  createdAt: string;
  paymentDate?: string | null;
}

interface PendingPaymentsResponse {
  payments: PendingPayment[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PendingPaymentsDashboardProps {
  readonly periodId: number;
}

export interface PendingPaymentsDashboardRef {
  refresh: () => void;
}

export const PendingPaymentsDashboard = forwardRef<PendingPaymentsDashboardRef, PendingPaymentsDashboardProps>(
  ({ periodId }, ref) => {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<number | null>(null);

  // Exponer método refresh al componente padre
  useImperativeHandle(ref, () => ({
    refresh: () => {
      loadPayments();
    }
  }));

  // Cargar pagos
  useEffect(() => {
    loadPayments();
  }, [periodId, currentPage, limit, searchDebounced, statusFilter]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      });

      // Agregar búsqueda si existe
      if (searchDebounced.trim()) {
        params.append('search', searchDebounced.trim());
      }

      // Agregar filtro de estado si no es 'ALL'
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/monthly-payments/all?periodId=${periodId}&${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar pagos');
      }

      const data: PendingPaymentsResponse = await response.json();
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setSearchDebounced('');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleMarkAsReceived = async (paymentId: number) => {
    try {
      await loadPayments();
      toast({
        title: "Pago marcado como recibido",
        description: "El pago ha sido procesado exitosamente y se ha enviado la notificación.",
      });
    } catch (err) {
      console.error('Error al actualizar pagos:', err);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pago.",
        variant: "destructive",
      });
    }
  };

  const sendWhatsAppMessage = async (payment: PendingPayment) => {
    try {
      setSendingWhatsApp(payment.id);
      
      const response = await fetch('/api/admin/send-pending-payment-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: periodId,
          studentIds: [payment.student.id]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al enviar mensaje');
      }

      toast({
        title: "Mensaje enviado",
        description: `Se ha enviado el recordatorio de pago a ${payment.student.name}`,
      });
    } catch (err) {
      console.error('Error al enviar mensaje WhatsApp:', err);
      toast({
        title: "Error al enviar mensaje",
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const copyReceiptLink = async (paymentId: number) => {
    try {
      // Buscar el recibo más reciente para este pago
      const response = await fetch(`/api/admin/receipts?paymentId=${paymentId}`);
      if (response.ok) {
        const receipts = await response.json();
        if (receipts.length > 0) {
          const receiptUrl = `${window.location.origin}/recibo/${receipts[0].id}`;
          await navigator.clipboard.writeText(receiptUrl);
          toast({
            title: "Link copiado",
            description: "El link del recibo ha sido copiado al portapapeles",
          });
        } else {
          toast({
            title: "Sin recibo",
            description: "No se encontró un recibo para este pago",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Error al copiar link del recibo:', err);
      toast({
        title: "Error",
        description: "No se pudo copiar el link del recibo",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (payment: PendingPayment) => {
    // Si está vencido y es pendiente
    if (payment.isOverdue && (payment.status === 'PENDING' || payment.status === 'OVERDUE')) {
      return (
        <Badge variant="destructive" className="bg-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      );
    }
    
    // Si es pago parcial
    if (payment.status === 'PARTIAL_PAID') {
      return (
        <Badge variant="secondary" className="bg-orange-600">
          <Clock className="h-3 w-3 mr-1" />
          Parcial
        </Badge>
      );
    }
    
    // Si está pagado
    if (payment.status === 'PAID') {
      return (
        <Badge variant="secondary" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pagado
        </Badge>
      );
    }
    
    // Si está pendiente
    if (payment.status === 'PENDING') {
      return (
        <Badge variant="secondary" className="bg-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>
      );
    }
    
    // Si está vencido
    if (payment.status === 'OVERDUE') {
      return (
        <Badge variant="destructive" className="bg-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      );
    }
    
    // Fallback
    return (
      <Badge variant="secondary" className="bg-gray-600">
        <Clock className="h-3 w-3 mr-1" />
        {payment.status}
      </Badge>
    );
  };

  if (loading && payments.length === 0) {
    return (
      <Card className="bg-gray-800/90 border-gray-600">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/90 border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Clock className="h-5 w-5 text-blue-400" />
          Gestión de Pagos
          <Badge variant="secondary" className="bg-blue-600">
            {pagination.totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, documento o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="ALL" className="text-white hover:bg-gray-700">
                  Todos los pagos
                </SelectItem>
                <SelectItem value="PENDING" className="text-white hover:bg-gray-700">
                  Pendientes
                </SelectItem>
                <SelectItem value="PAID" className="text-white hover:bg-gray-700">
                  Pagados
                </SelectItem>
                <SelectItem value="OVERDUE" className="text-white hover:bg-gray-700">
                  Vencidos
                </SelectItem>
                <SelectItem value="PARTIAL_PAID" className="text-white hover:bg-gray-700">
                  Parciales
                </SelectItem>
              </SelectContent>
            </Select>

            {searchTerm && (
              <Button
                variant="outline"
                onClick={handleSearchClear}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
            <p className="text-red-300 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* Tabla de pagos pendientes */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-600">
                <TableHead className="text-gray-300">Estudiante</TableHead>
                <TableHead className="text-gray-300">Teléfono</TableHead>
                <TableHead className="text-gray-300">Monto</TableHead>
                <TableHead className="text-gray-300">Estado</TableHead>
                <TableHead className="text-gray-300">Vencimiento</TableHead>
                <TableHead className="text-gray-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="border-gray-600">
                  <TableCell className="text-white font-medium">
                    {payment.student.name}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {payment.student.phone}
                  </TableCell>
                  <TableCell className="text-white font-semibold">
                    {formatCurrency(payment.expectedAmount)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(payment.dueDate).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Solo mostrar botón "Marcar Recibido" para pagos pendientes */}
                      {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Marcar Recibido
                        </Button>
                      )}

                      {/* Solo mostrar botón "WhatsApp" para pagos pendientes */}
                      {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                          onClick={() => sendWhatsAppMessage(payment)}
                          disabled={sendingWhatsApp === payment.id}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {sendingWhatsApp === payment.id ? 'Enviando...' : 'WhatsApp'}
                        </Button>
                      )}

                      {/* Mostrar botón "Recibo" para pagos completados y parciales */}
                      {(payment.status === 'PAID' || payment.status === 'PARTIAL_PAID') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-600 border-gray-500 text-white hover:bg-gray-700"
                          onClick={() => copyReceiptLink(payment.id)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Recibo
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <AdvancedPagination
          pagination={pagination}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          itemName="pagos pendientes"
          limitOptions={[5, 10, 20, 30, 50]}
        />

        {payments.length === 0 && !loading && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">No hay pagos pendientes</h3>
            <p className="text-gray-400">
              Todos los pagos han sido procesados para este período.
            </p>
          </div>
        )}
      </CardContent>

      {/* Modal para marcar pago como recibido */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        {selectedPayment && (
          <MarkPaymentReceivedModal
            isOpen={!!selectedPayment}
            onClose={() => setSelectedPayment(null)}
            payment={selectedPayment}
            onSuccess={() => {
              handleMarkAsReceived(selectedPayment.id);
              setSelectedPayment(null);
            }}
          />
        )}
      </Dialog>
    </Card>
  );
});
