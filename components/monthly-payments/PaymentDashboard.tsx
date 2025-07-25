"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
  Search
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
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, [periodId, currentPage, searchDebounced]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}`);

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
        students={data.payments.map((p) => ({
          id: p.student.id,
          name: p.student.name,
          parentPhone: p.student.phone, // El phone del estudiante es el teléfono del acudiente
          hasForm: !!p.paymentFormId,
        }))}
      />

      {/* Barra de Búsqueda */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-400" />
            Buscar Estudiantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm('')}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enlaces de Formularios */}
      {data.payments.length > 0 && (
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
            <p className="text-gray-300 text-sm">
              Mostrando {data.payments.length} de {data.pagination.total} estudiantes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.payments
                .filter((p) => p.paymentFormId)
                .map((payment) => (
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
            
            {/* Paginación */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => data.pagination.hasPrev && setCurrentPage(currentPage - 1)}
                        className={`${!data.pagination.hasPrev ? 'pointer-events-none opacity-50' : 'cursor-pointer'} 
                          bg-gray-700 border-gray-600 text-white hover:bg-gray-600`}
                      />
                    </PaginationItem>
                    
                    {/* Páginas */}
                    {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        const current = currentPage;
                        return page === 1 || page === data.pagination.totalPages || 
                               (page >= current - 1 && page <= current + 1);
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <PaginationItem>
                              <PaginationEllipsis className="text-gray-400" />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={page === currentPage}
                              className={`cursor-pointer ${page === currentPage 
                                ? 'bg-blue-600 text-white border-blue-500' 
                                : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'}`}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => data.pagination.hasNext && setCurrentPage(currentPage + 1)}
                        className={`${!data.pagination.hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'} 
                          bg-gray-700 border-gray-600 text-white hover:bg-gray-600`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barra de progreso */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white">Progreso de Recaudación</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Lista de pagos */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white">Pagos por Estudiante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.payments.map((payment, index) => {
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
        </CardContent>
      </Card>
    </div>
  );
}
