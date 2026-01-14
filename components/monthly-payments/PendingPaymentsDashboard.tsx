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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MessageSquare,
  Copy,
  X,
  Filter,
  Trash2,
  Send
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MarkPaymentReceivedModal } from '@/components/admin/MarkPaymentReceivedModal';
import { WhatsAppMessageTemplateModal } from './WhatsAppMessageTemplateModal';
import { ReceiptTemplateModal } from '@/components/admin/ReceiptTemplateModal';
import { toast } from '@/hooks/use-toast';

interface PendingPayment {
  id: number;
  student: {
    id: string;
    name: string;
    phone: string;
  };
  class: {
    id: number;
    name: string;
    sport: string;
  } | null;
  expectedAmount: number;
  paidAmount?: number | null;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL_PAID';
  period: string;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
  paymentDate?: string | null;
  reminderSent?: boolean;
  reminderSentAt?: string | null;
  receiptSent?: boolean;
  receiptSentAt?: string | null;
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
  // const [sendingWhatsApp, setSendingWhatsApp] = useState<number | null>(null); // Ya no se usa - envío deshabilitado
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [paymentToDelete, setPaymentToDelete] = useState<PendingPayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [bulkSendModalOpen, setBulkSendModalOpen] = useState(false);
  const [whatsAppTemplateModalOpen, setWhatsAppTemplateModalOpen] = useState(false);
  const [selectedPaymentForTemplate, setSelectedPaymentForTemplate] = useState<PendingPayment | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<{
    payment: PendingPayment;
    receiptId: number;
    receivedAmount: number;
    paymentMethod: string;
    isPartialPayment: boolean;
    remainingAmount: number;
    nextPaymentDate?: string;
  } | null>(null);

  // Exponer método refresh al componente padre
  useImperativeHandle(ref, () => ({
    refresh: () => {
      loadPayments();
    }
  }));

  // Cargar pagos
  useEffect(() => {
    console.log('useEffect ejecutado - refreshTrigger:', refreshTrigger);
    loadPayments();
  }, [periodId, currentPage, limit, searchDebounced, statusFilter, refreshTrigger]);

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
      console.log('🔄 loadPayments ejecutado');
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

      // Agregar timestamp para evitar cache
      const timestamp = Date.now();
      const url = `/api/admin/monthly-payments/all?periodId=${periodId}&${params}&_t=${timestamp}`;
      console.log('🌐 Haciendo petición a:', url);
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('📡 Respuesta recibida:', response.status);
      
      if (!response.ok) {
        throw new Error('Error al cargar pagos');
      }

      const data: PendingPaymentsResponse = await response.json();
      console.log('📊 Datos recibidos de la API:', data.payments);
      console.log('✅ Pagos PAID encontrados:', data.payments.filter(p => p.status === 'PAID').length);
      console.log('⏳ Pagos PENDING encontrados:', data.payments.filter(p => p.status === 'PENDING').length);
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (err) {
      console.error('❌ Error en loadPayments:', err);
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

  const handleMarkAsReceived = async () => {
    try {
      console.log('handleMarkAsReceived ejecutado');
      
      // Pequeño delay para asegurar que la transacción se complete en la base de datos
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forzar refresh del useEffect
      setRefreshTrigger(prev => {
        console.log('refreshTrigger cambiando de', prev, 'a', prev + 1);
        return prev + 1;
      });
      
      // También forzar refresh directo de los pagos
      await loadPayments();
      
      toast({
        title: "Pago marcado como recibido",
        description: "El pago ha sido procesado exitosamente.",
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

  // Función comentada - ya no se envían mensajes automáticamente
  // const sendWhatsAppMessage = async (payment: PendingPayment) => {
  //   try {
  //     setSendingWhatsApp(payment.id);
  //     
  //     const response = await fetch('/api/admin/send-pending-payment-whatsapp', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         periodId: periodId,
  //         studentIds: [payment.student.id]
  //       })
  //     });

  //     if (!response.ok) {
  //       const error = await response.json();
  //       throw new Error(error.message || 'Error al enviar mensaje');
  //     }

  //     toast({
  //       title: "Mensaje enviado",
  //       description: `Se ha enviado el recordatorio de pago a ${payment.student.name}`,
  //     });
  //     // Refrescar la lista para actualizar el estado de reminderSent
  //     await loadPayments();
  //   } catch (err) {
  //     console.error('Error al enviar mensaje WhatsApp:', err);
  //     toast({
  //       title: "Error al enviar mensaje",
  //       description: err instanceof Error ? err.message : 'Error desconocido',
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setSendingWhatsApp(null);
  //   }
  // };

  const handleShowWhatsAppTemplate = (payment: PendingPayment) => {
    setSelectedPaymentForTemplate(payment);
    setWhatsAppTemplateModalOpen(true);
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

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      setDeletingPayment(true);
      
      const response = await fetch(`/api/admin/monthly-payments/${paymentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.details || 'Error al eliminar el pago');
      }

      // Mostrar mensaje de éxito con advertencia si hay formularios eliminados
      if (data.warning) {
        toast({
          title: "Pago eliminado",
          description: `${data.message}. ${data.warning}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Pago eliminado",
          description: `El pago de ${paymentToDelete.student.name} ha sido eliminado exitosamente`,
        });
      }

      // Cerrar el modal y refrescar la lista
      setPaymentToDelete(null);
      await loadPayments();
    } catch (err) {
      console.error('Error al eliminar pago:', err);
      toast({
        title: "Error al eliminar pago",
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: "destructive",
      });
    } finally {
      setDeletingPayment(false);
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
            <Button
              onClick={() => setBulkSendModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={true}
              title="Función deshabilitada - Los mensajes ya no se envían automáticamente"
            >
              <Send className="h-4 w-4 mr-2" />
              Envío Masivo
            </Button>
            
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
                <TableHead className="text-gray-300">Clase</TableHead>
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
                    {payment.class ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{payment.class.name}</span>
                        <span className="text-xs text-gray-400">{payment.class.sport}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">Sin clase asignada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {payment.student.phone}
                  </TableCell>
                  <TableCell className="text-white font-semibold">
                    {payment.status === 'PAID' || payment.status === 'PARTIAL_PAID' ? (
                      <div className="flex flex-col">
                        <span className="text-green-400">
                          {formatCurrency(payment.paidAmount || 0)}
                        </span>
                      </div>
                    ) : (
                      formatCurrency(payment.expectedAmount)
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('es-CO') : 'Calculando...'}
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

                      {/* Botón para mostrar plantilla de mensaje WhatsApp */}
                      {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                          onClick={() => handleShowWhatsAppTemplate(payment)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Ver Mensaje
                        </Button>
                      )}

                      {/* Solo mostrar botón "Eliminar" para pagos pendientes */}
                      {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-600 border-red-500 text-white hover:bg-red-700"
                          onClick={() => setPaymentToDelete(payment)}
                          disabled={deletingPayment}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
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
            onSuccess={async () => {
              await handleMarkAsReceived();
              setSelectedPayment(null);
            }}
            onReceiptGenerated={(data: {
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
            }) => {
              // Cerrar el modal de marcar pago
              setSelectedPayment(null);
              // Mostrar el modal de recibo
              setReceiptModalData({
                payment: selectedPayment!,
                receiptId: data.receiptId,
                receivedAmount: data.receivedAmount,
                paymentMethod: data.paymentMethod,
                isPartialPayment: data.isPartialPayment,
                remainingAmount: data.remainingAmount,
                nextPaymentDate: data.nextPaymentDate,
              });
              setReceiptModalOpen(true);
            }}
          />
        )}
      </Dialog>

      {/* Modal de plantilla de recibo */}
      {receiptModalData && (
        <ReceiptTemplateModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setReceiptModalData(null);
            // Recargar la lista después de cerrar
            handleMarkAsReceived();
          }}
          payment={{
            id: receiptModalData.payment.id,
            student: {
              name: receiptModalData.payment.student.name,
              phone: receiptModalData.payment.student.phone,
            },
            expectedAmount: receiptModalData.payment.expectedAmount,
            period: receiptModalData.payment.period,
            class: receiptModalData.payment.class || null,
          }}
          receiptId={receiptModalData.receiptId}
          receivedAmount={receiptModalData.receivedAmount}
          paymentMethod={receiptModalData.paymentMethod}
          isPartialPayment={receiptModalData.isPartialPayment}
          remainingAmount={receiptModalData.remainingAmount}
          nextPaymentDate={receiptModalData.nextPaymentDate}
        />
      )}

      {/* Modal de confirmación para eliminar pago */}
      <Dialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Esta acción no se puede deshacer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {paymentToDelete && (
              <>
                <p className="text-gray-300">
                  ¿Estás seguro de que deseas eliminar el pago de{' '}
                  <span className="font-semibold text-white">
                    {paymentToDelete.student.name}
                  </span>
                  {paymentToDelete.class && (
                    <>
                      {' '}para la clase{' '}
                      <span className="font-semibold text-white">
                        {paymentToDelete.class.name}
                      </span>
                    </>
                  )}
                  ?
                </p>
                <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Monto esperado:</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(paymentToDelete.expectedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Período:</span>
                    <span className="text-white">{paymentToDelete.period}</span>
                  </div>
                  {paymentToDelete.dueDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Vencimiento:</span>
                      <span className="text-white">
                        {new Date(paymentToDelete.dueDate).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-300 text-sm">
                    <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente 
                    el registro del pago. Solo se pueden eliminar pagos pendientes o vencidos.
                  </p>
                </div>
              </>
            )}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setPaymentToDelete(null)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                disabled={deletingPayment}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeletePayment}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deletingPayment}
              >
                {deletingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Pago
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de envío masivo */}
      <Dialog open={bulkSendModalOpen} onOpenChange={setBulkSendModalOpen}>
        <BulkSendModal
          periodId={periodId}
          onClose={() => setBulkSendModalOpen(false)}
          onSuccess={async () => {
            await loadPayments();
            setBulkSendModalOpen(false);
          }}
        />
      </Dialog>

      {/* Modal de plantilla de mensaje WhatsApp */}
      <WhatsAppMessageTemplateModal
        isOpen={whatsAppTemplateModalOpen}
        onClose={() => {
          setWhatsAppTemplateModalOpen(false);
          setSelectedPaymentForTemplate(null);
        }}
        payment={selectedPaymentForTemplate}
        periodId={periodId}
      />
    </Card>
  );
});

// Modal de envío masivo
interface BulkSendModalProps {
  periodId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkSendModal({ periodId, onClose, onSuccess }: BulkSendModalProps) {
  const [selectedCutoff, setSelectedCutoff] = useState<'15' | '30' | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // const [sending, setSending] = useState(false); // Ya no se usa - envío deshabilitado
  // const [sentCount, setSentCount] = useState(0); // Ya no se usa - envío deshabilitado
  // const [failedCount, setFailedCount] = useState(0); // Ya no se usa - envío deshabilitado

  const loadPaymentsByCutoff = async (cutoffDay: '15' | '30') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/monthly-payments/by-cutoff?periodId=${periodId}&cutoffDay=${cutoffDay}`);
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.payments || []);
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al cargar pagos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cargando pagos:', error);
      toast({
        title: "Error",
        description: "Error al cargar los pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCutoff) {
      loadPaymentsByCutoff(selectedCutoff);
    } else {
      setPayments([]);
    }
  }, [selectedCutoff, periodId]);

  // Función comentada - ya no se envían mensajes automáticamente
  // const handleSend = async () => {
  //   if (!selectedCutoff || payments.length === 0) return;

  //   try {
  //     setSending(true);
  //     setSentCount(0);
  //     setFailedCount(0);

  //     const studentIds = payments.map(p => p.student.id);
  //     
  //     const response = await fetch('/api/admin/send-pending-payment-whatsapp', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         periodId: periodId,
  //         studentIds: studentIds
  //       })
  //     });

  //     const data = await response.json();

  //     if (response.ok && data.success) {
  //       setSentCount(data.sentCount || 0);
  //       setFailedCount(data.failedCount || 0);
  //       
  //       toast({
  //         title: "Mensajes enviados",
  //         description: `Se enviaron ${data.sentCount} mensajes exitosamente${data.failedCount > 0 ? `. ${data.failedCount} fallaron.` : '.'}`,
  //       });
  //       
  //       // Recargar pagos para actualizar estados
  //       await loadPaymentsByCutoff(selectedCutoff);
  //       onSuccess();
  //     } else {
  //       throw new Error(data.message || 'Error al enviar mensajes');
  //     }
  //   } catch (error) {
  //     console.error('Error enviando mensajes:', error);
  //     toast({
  //       title: "Error",
  //       description: error instanceof Error ? error.message : 'Error al enviar mensajes',
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setSending(false);
  //   }
  // };

  return (
    <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Send className="h-5 w-5 text-green-400" />
          Envío Masivo de Recordatorios
        </DialogTitle>
        <DialogDescription className="text-gray-300">
          Los mensajes ya no se envían automáticamente. Usa el botón "Ver Mensaje" en cada pago individual para copiar el mensaje manualmente.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* Selector de día de corte */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Día de Corte
          </label>
          <Select value={selectedCutoff || ''} onValueChange={(value) => setSelectedCutoff(value as '15' | '30')}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Selecciona el día de corte" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="15" className="text-white hover:bg-gray-700">
                Corte del 15
              </SelectItem>
              <SelectItem value="30" className="text-white hover:bg-gray-700">
                Corte del 30
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de estudiantes */}
        {(() => {
          if (loading) {
            return (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-300">Cargando estudiantes...</span>
              </div>
            );
          }
          
          if (selectedCutoff && payments.length > 0) {
            return (
          <>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                <strong className="text-white">{payments.length}</strong> estudiantes con pagos pendientes para el corte del {selectedCutoff} que aún no han recibido recordatorio
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Los pagos que ya recibieron recordatorio no se muestran en esta lista
              </p>
            </div>
            
            <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300">Estudiante</TableHead>
                    <TableHead className="text-gray-300">Clase</TableHead>
                    <TableHead className="text-gray-300">Monto</TableHead>
                    <TableHead className="text-gray-300">Estado Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="border-gray-600">
                      <TableCell className="text-white font-medium">
                        {payment.student.name}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {payment.class ? payment.class.name : 'Sin clase'}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatCurrency(payment.expectedAmount)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const isOverdue = payment.status === 'OVERDUE';
                          const badgeClassName = isOverdue 
                            ? "bg-red-600 text-white text-xs"
                            : "bg-yellow-600 text-white text-xs";
                          
                          return (
                            <Badge 
                              variant="secondary" 
                              className={badgeClassName}
                            >
                              {isOverdue ? (
                                <>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Vencido
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pendiente
                                </>
                              )}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Función deshabilitada",
                    description: "Los mensajes ya no se envían automáticamente. Usa el botón 'Ver Mensaje' en cada pago para copiar el mensaje manualmente.",
                    variant: "default",
                  });
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white"
                disabled={true}
                title="Función deshabilitada - Los mensajes ya no se envían automáticamente"
              >
                <Send className="h-4 w-4 mr-2" />
                Envío Deshabilitado
              </Button>
            </div>
          </>
            );
          }
          
          if (selectedCutoff && payments.length === 0) {
            return (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2 text-white">No hay pagos pendientes</h3>
                <p className="text-gray-400">
                  No se encontraron estudiantes con pagos pendientes para el corte del {selectedCutoff}
                </p>
              </div>
            );
          }
          
          return null;
        })()}
      </div>
    </DialogContent>
  );
}
