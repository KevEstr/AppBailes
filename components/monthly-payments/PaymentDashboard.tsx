'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Copy,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
      id: number;
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
}

export function PaymentDashboard({ periodId }: PaymentDashboardProps) {
  const [data, setData] = useState<PaymentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [periodId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/payment-dashboard/${periodId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos del dashboard');
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pendiente', variant: 'secondary' as const },
      PAID: { label: 'Pagado', variant: 'default' as const },
      PARTIAL_PAID: { label: 'Pago Parcial', variant: 'outline' as const },
      OVERDUE: { label: 'Vencido', variant: 'destructive' as const },
      PENDING_REVIEW: { label: 'En Revisión', variant: 'outline' as const },
      CANCELLED: { label: 'Cancelado', variant: 'secondary' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'secondary' as const };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const copyPaymentLink = async (formId: string, studentName: string) => {
    const link = `${window.location.origin}/payment/${formId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(formId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard
      console.error('Error al copiar enlace:', err);
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
            {data.period.name} - Vence: {new Date(data.period.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{data.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Monto Esperado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(data.totalExpected)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Monto Recaudado</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(data.totalCollected)}</div>
            <p className="text-xs text-gray-400">
              {data.collectionRate}% de recaudación
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{data.pendingReview}</div>
            <p className="text-xs text-gray-400">
              {data.overdue} vencidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enlaces de Formularios */}
      {data.payments.length > 0 && (
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-400" />
              Enlaces de Formularios de Pago
            </CardTitle>
            <p className="text-gray-400 text-sm">
              Copia estos enlaces y compártelos con los acudientes para que puedan realizar el pago
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.payments.filter(p => p.paymentFormId).map((payment) => (
                <div key={payment.id} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{payment.student.name}</div>
                      <div className="text-sm text-gray-400">{formatCurrency(payment.expectedAmount)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                        onClick={() => copyPaymentLink(payment.paymentFormId!, payment.student.name)}
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
                        onClick={() => window.open(`/payment/${payment.paymentFormId}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            {data.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-600 rounded-lg bg-gray-700/50">
                <div className="flex-1">
                  <div className="font-medium text-white">{payment.student.name}</div>
                  <div className="text-sm text-gray-400">
                    {payment.student.phone}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium text-white">
                      {payment.paidAmount ? formatCurrency(payment.paidAmount) : '--'}
                    </div>
                    <div className="text-sm text-gray-400">
                      de {formatCurrency(payment.expectedAmount)}
                    </div>
                  </div>
                  
                  {payment.paymentFormId && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                        onClick={() => copyPaymentLink(payment.paymentFormId!, payment.student.name)}
                      >
                        {copiedLink === payment.paymentFormId ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            ¡Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar Link
                          </>
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
                        onClick={() => window.open(`/payment/${payment.paymentFormId}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  )}
                  
                  {getStatusBadge(payment.status)}
                  
                  {payment.hasProofs && (
                    <Badge variant="outline" className="border-gray-500 text-gray-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Con comprobante
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 