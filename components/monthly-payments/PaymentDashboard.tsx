"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdvancedPagination } from '@/components/ui/advanced-pagination';
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Copy,
  Link as LinkIcon,
  ExternalLink,
  AlertCircle,
  Eye,
  Search,
  X
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { WhatsAppSender } from './WhatsAppSender';
import { useRouter } from 'next/navigation';

interface PaymentDashboardProps {
  periodId: number;
}

interface PaymentDashboardData {
  period: {
    id: number;
    name: string;
    dueDate: Date;
  };
  totalStudents: number;
  totalExpected: number;
  totalCollected: number;
  pendingReview: number;
  overdue: number;
  collectionRate: number;
  payments: Array<{
    id: number;
    student: {
      id: string;
      name: string;
      phone: string;
    };
    expectedAmount: number;
    paidAmount: number | null;
    status: string;
    paymentDate: Date | null;
    hasProofs: boolean;
    paymentFormId?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function PaymentDashboard({ periodId }: PaymentDashboardProps) {
  const [data, setData] = useState<PaymentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  
  // Estados para formularios de pago
  const [paymentFormsPage, setPaymentFormsPage] = useState(1);
  const [paymentFormsLimit, setPaymentFormsLimit] = useState(10);
  const [paymentFormsSearchTerm, setPaymentFormsSearchTerm] = useState('');
  const [paymentFormsSearchDebounced, setPaymentFormsSearchDebounced] = useState('');
  const [paymentFormsData, setPaymentFormsData] = useState<{
    paymentForms: Array<{
      id: number;
      student: {
        id: string;
        name: string;
        phone: string;
      };
      expectedAmount: number;
      paymentFormId: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } | null>(null);
  const [paymentFormsLoading, setPaymentFormsLoading] = useState(false);

  // Estados para pagos
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(10);
  const [paymentsSearchTerm, setPaymentsSearchTerm] = useState('');
  const [paymentsSearchDebounced, setPaymentsSearchDebounced] = useState('');
  const [paymentsData, setPaymentsData] = useState<{
    payments: Array<{
      id: number;
      student: {
        id: string;
        name: string;
        phone: string;
      };
      expectedAmount: number;
      paidAmount: number | null;
      status: string;
      paymentDate: Date | null;
      hasProofs: boolean;
      paymentFormId?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, [periodId, currentPage, searchDebounced]);

  // Cargar formularios de pago
  useEffect(() => {
    loadPaymentForms();
  }, [periodId, paymentFormsPage, paymentFormsLimit, paymentFormsSearchDebounced]);

  // Cargar pagos
  useEffect(() => {
    loadPayments();
  }, [periodId, paymentsPage, paymentsLimit, paymentsSearchDebounced]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce para búsqueda de formularios de pago
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentFormsSearchDebounced(paymentFormsSearchTerm);
      setPaymentFormsPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [paymentFormsSearchTerm]);

  // Debounce para búsqueda de pagos
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentsSearchDebounced(paymentsSearchTerm);
      setPaymentsPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [paymentsSearchTerm]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      // Agregar búsqueda si existe
      if (searchDebounced.trim()) {
        params.append('search', searchDebounced.trim());
      }
      
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar datos del dashboard");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentForms = async () => {
    try {
      setPaymentFormsLoading(true);
      
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: paymentFormsPage.toString(),
        limit: paymentFormsLimit.toString(),
      });
      
      // Agregar búsqueda si existe
      if (paymentFormsSearchDebounced.trim()) {
        params.append('search', paymentFormsSearchDebounced.trim());
      }
      
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}/payment-forms?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar formularios de pago");
      }

      const paymentFormsData = await response.json();
      setPaymentFormsData(paymentFormsData);
    } catch (err) {
      console.error('Error loading payment forms:', err);
    } finally {
      setPaymentFormsLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      
      // Construir parámetros de query
      const params = new URLSearchParams({
        page: paymentsPage.toString(),
        limit: paymentsLimit.toString(),
      });
      
      // Agregar búsqueda si existe
      if (paymentsSearchDebounced.trim()) {
        params.append('search', paymentsSearchDebounced.trim());
      }
      
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}/payments?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar pagos");
      }

      const paymentsData = await response.json();
      setPaymentsData(paymentsData);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const copyPaymentLink = async (formId: string, studentName: string) => {
    const link = `${window.location.origin}/payment/${formId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(formId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard
      console.error("Error al copiar enlace:", err);
    }
  };

  const handlePaymentFormsPageChange = (page: number) => {
    setPaymentFormsPage(page);
  };

  const handlePaymentFormsLimitChange = (newLimit: number) => {
    setPaymentFormsLimit(newLimit);
    setPaymentFormsPage(1);
  };

  const handlePaymentFormsSearchClear = () => {
    setPaymentFormsSearchTerm('');
    setPaymentFormsSearchDebounced('');
    setPaymentFormsPage(1);
  };

  const handlePaymentsPageChange = (page: number) => {
    setPaymentsPage(page);
  };

  const handlePaymentsLimitChange = (newLimit: number) => {
    setPaymentsLimit(newLimit);
    setPaymentsPage(1);
  };

  const handlePaymentsSearchClear = () => {
    setPaymentsSearchTerm('');
    setPaymentsSearchDebounced('');
    setPaymentsPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <Button onClick={loadDashboardData} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) {
    return <div>No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-300">
            {data.period.name} - Vence:{" "}
            {new Date(data.period.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Total Estudiantes
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {data.totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Monto Esperado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(data.totalExpected)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Monto Recaudado
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(data.totalCollected)}
            </div>
            <p className="text-xs text-gray-400">
              {data.collectionRate}% de recaudación
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Pendientes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {data.pendingReview}
            </div>
            <p className="text-xs text-gray-400">{data.overdue} vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Envío masivo de WhatsApp */}
      <WhatsAppSender
        periodId={data.period.id}
        periodName={data.period.name}
      />

      {/* Enlaces de Formularios */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-400" />
            Enlaces de Formularios de Pago
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Copia estos enlaces y compártelos con los acudientes para que
            puedan realizar el pago
          </p>
        </CardHeader>
        <CardContent>
          {/* Barra de búsqueda para formularios */}
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar formularios por nombre o teléfono..."
                value={paymentFormsSearchTerm}
                onChange={(e) => setPaymentFormsSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            {paymentFormsSearchTerm && (
              <Button
                variant="outline"
                onClick={handlePaymentFormsSearchClear}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {paymentFormsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-gray-300">Cargando formularios...</span>
            </div>
          ) : paymentFormsData?.paymentForms && paymentFormsData.paymentForms.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentFormsData.paymentForms.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white">
                          {payment.student.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatCurrency(payment.expectedAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.student.phone}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                          onClick={() =>
                            copyPaymentLink(
                              payment.paymentFormId!,
                              payment.student.name
                            )
                          }
                        >
                          {copiedLink === payment.paymentFormId ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              ¡Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
                          onClick={() =>
                            window.open(
                              `/payment/${payment.paymentFormId}`,
                              "_blank"
                            )
                          }
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación para formularios */}
              {paymentFormsData.pagination.totalPages > 1 && (
                <div className="mt-6">
                  <AdvancedPagination
                    pagination={paymentFormsData.pagination}
                    currentPage={paymentFormsPage}
                    onPageChange={handlePaymentFormsPageChange}
                    onLimitChange={handlePaymentFormsLimitChange}
                    itemName="formularios"
                    limitOptions={[5, 10, 20, 30, 50]}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                {paymentFormsSearchTerm ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p>No se encontraron formularios que coincidan con "{paymentFormsSearchTerm}"</p>
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p>No hay formularios de pago disponibles</p>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de pagos */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white">Pagos por Estudiante</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Barra de progreso de recaudación */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">Progreso de Recaudación</span>
              <span className="text-sm text-gray-300">{data.collectionRate}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-300">
              <span>{formatCurrency(data.totalCollected)}</span>
              <span>{formatCurrency(data.totalExpected)}</span>
            </div>
          </div>

          {/* Barra de búsqueda para pagos */}
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar pagos por nombre o teléfono..."
                value={paymentsSearchTerm}
                onChange={(e) => setPaymentsSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            {paymentsSearchTerm && (
              <Button
                variant="outline"
                onClick={handlePaymentsSearchClear}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {paymentsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-gray-300">Cargando pagos...</span>
            </div>
          ) : paymentsData?.payments && paymentsData.payments.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paymentsData.payments.map((payment, index) => {
              const statusConfig = {
                PAID: {
                  label: "Pagado",
                  icon: CheckCircle,
                  className: "bg-green-900/50 text-green-300 border-green-600",
                  bgClass: "bg-green-900/10",
                },
                PARTIAL_PAID: {
                  label: "Pago Parcial",
                  icon: AlertCircle,
                  className:
                    "bg-orange-900/50 text-orange-300 border-orange-600",
                  bgClass: "bg-orange-900/10",
                },
                PENDING: {
                  label: "Pendiente",
                  icon: Clock,
                  className:
                    "bg-yellow-900/50 text-yellow-300 border-yellow-600",
                  bgClass: "bg-yellow-900/10",
                },
                PENDING_REVIEW: {
                  label: "En Revisión",
                  icon: Eye,
                  className: "bg-blue-900/50 text-blue-300 border-blue-600",
                  bgClass: "bg-blue-900/10",
                },
                OVERDUE: {
                  label: "Vencido",
                  icon: XCircle,
                  className: "bg-red-900/50 text-red-300 border-red-600",
                  bgClass: "bg-red-900/10",
                },
                CANCELLED: {
                  label: "Cancelado",
                  icon: XCircle,
                  className: "bg-gray-900/50 text-gray-300 border-gray-600",
                  bgClass: "bg-gray-900/10",
                },
              };

              const config =
                statusConfig[payment.status as keyof typeof statusConfig] ||
                statusConfig.PENDING;
              const StatusIcon = config.icon;

              // Calcular información de pago parcial
              const isPartialPayment = payment.status === "PARTIAL_PAID";
              const paidAmount = payment.paidAmount || 0;
              const remainingAmount = payment.expectedAmount - paidAmount;
              const paymentPercentage =
                payment.expectedAmount > 0
                  ? (paidAmount / payment.expectedAmount) * 100
                  : 0;

              return (
                <Card
                  key={payment.id}
                  className={`${config.bgClass} border-gray-600 hover:border-gray-500 transition-colors`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">
                          {payment.student.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {payment.student.phone}
                        </p>
                      </div>
                      <Badge className={config.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    {/* Información de montos */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">
                          Monto esperado:
                        </span>
                        <span className="text-white font-medium">
                          {formatCurrency(payment.expectedAmount)}
                        </span>
                      </div>

                      {isPartialPayment && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">
                              Pagado:
                            </span>
                            <span className="text-green-400 font-medium">
                              {formatCurrency(paidAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">
                              Saldo pendiente:
                            </span>
                            <span className="text-orange-400 font-medium">
                              {formatCurrency(remainingAmount)}
                            </span>
                          </div>

                          {/* Barra de progreso de pago */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progreso de pago</span>
                              <span>{paymentPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(paymentPercentage, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </>
                      )}

                      {payment.status === "PAID" && payment.paymentDate && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">
                            Fecha de pago:
                          </span>
                          <span className="text-green-400 text-sm">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {payment.paymentFormId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                          onClick={() =>
                            window.open(
                              `/payment/${payment.paymentFormId}`,
                              "_blank"
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver formulario
                        </Button>
                      )}

                      {payment.hasProofs && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:flex-1 bg-blue-700 border-blue-600 text-white hover:bg-blue-600"
                          onClick={() =>
                            router.push("/admin/monthly-payments/review")
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Revisar
                        </Button>
                      )}

                      {isPartialPayment && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:flex-1 bg-orange-700 border-orange-600 text-white hover:bg-orange-600"
                          onClick={() => {
                            // Aquí podrías abrir un modal para crear recordatorio de deuda
                            alert(
                              `Saldo pendiente: ${formatCurrency(
                                remainingAmount
                              )}`
                            );
                          }}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Gestionar saldo
                        </Button>
                                             )}
                     </div>
                   </CardContent>
                 </Card>
               );
             })}
               </div>

               {/* Paginación para pagos */}
               {paymentsData.pagination.totalPages > 1 && (
                 <div className="mt-6">
                   <AdvancedPagination
                     pagination={paymentsData.pagination}
                     currentPage={paymentsPage}
                     onPageChange={handlePaymentsPageChange}
                     onLimitChange={handlePaymentsLimitChange}
                     itemName="pagos"
                     limitOptions={[5, 10, 20, 30, 50]}
                   />
                 </div>
               )}
             </>
           ) : (
             <div className="text-center py-8">
               <div className="text-gray-400 mb-2">
                 {paymentsSearchTerm ? (
                   <>
                     <Search className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                     <p>No se encontraron pagos que coincidan con "{paymentsSearchTerm}"</p>
                   </>
                 ) : (
                   <>
                     <Users className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                     <p>No hay pagos disponibles</p>
                   </>
                 )}
               </div>
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }
