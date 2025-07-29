'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Send,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { Loading } from '@/components/ui/loading';
import { AdvancedPagination } from '@/components/ui/advanced-pagination';
import { AuthGuard } from '@/components/auth-guard';
import { formatCurrency } from '@/lib/utils';

interface EnrollmentPayment {
  id: number;
  studentId: string;
  studentName: string;
  studentPhone: string;
  sport: 'DANCE' | 'VOLLEYBALL';
  expectedAmount: number;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'PENDING_REVIEW';
  paymentDate?: string;
  createdAt: string;
  hasActiveForm: boolean;
  hasProof: boolean;
  latestProofStatus?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function EnrollmentPaymentsContent() {
  const [payments, setPayments] = useState<EnrollmentPayment[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // WhatsApp
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [currentPage, statusFilter, sportFilter, limit]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(1);
        loadPayments();
      } else if (searchTerm === "") {
        loadPayments();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        status: statusFilter !== "all" ? statusFilter : "",
        search: searchTerm
      });

      const response = await fetch(`/api/admin/enrollment-payments?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Error al cargar pagos de inscripción');
      }
    } catch (error) {
      console.error('Error loading enrollment payments:', error);
      setError('Error de conexión al cargar pagos de inscripción');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = async (studentId: string) => {
    try {
      setSendingWhatsApp(studentId);
      
      const response = await fetch('/api/admin/send-enrollment-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('WhatsApp enviado exitosamente');
        loadPayments(); // Recargar para actualizar estado
      } else {
        setError(data.message || 'Error al enviar WhatsApp');
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      setError('Error de conexión al enviar WhatsApp');
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSportFilter('all');
    setCurrentPage(1);
    setLimit(10);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500 text-white';
      case 'PENDING':
        return 'bg-yellow-500 text-white';
      case 'PENDING_REVIEW':
        return 'bg-blue-500 text-white';
      case 'CANCELLED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Pagado';
      case 'PENDING':
        return 'Pendiente';
      case 'PENDING_REVIEW':
        return 'En Revisión';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getSportLabel = (sport: string) => {
    switch (sport) {
      case 'DANCE':
        return 'Baile';
      case 'VOLLEYBALL':
        return 'Voleibol';
      default:
        return sport;
    }
  };

  // Calcular estadísticas
  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.status === 'PAID').length;
  const pendingPayments = payments.filter(p => p.status === 'PENDING').length;
  const reviewPayments = payments.filter(p => p.status === 'PENDING_REVIEW').length;
  const totalAmount = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
  const paidAmount = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  if (loading && payments.length === 0) {
    return <Loading message="Cargando pagos de inscripción..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 px-3 py-1 rounded-md text-sm font-medium min-w-[120px]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver al Panel
                  </Button>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 leading-tight">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  Pagos de Inscripción
                </h1>
              </div>
              <p className="text-gray-400 text-sm sm:ml-2 mt-1 sm:mt-0">Gestionar pagos de inscripción de estudiantes</p>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <Alert className="border-red-500 bg-red-900/20">
              <AlertDescription className="text-red-400">
                {error}
                <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-2 text-red-400">
                  ✕
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-900/20">
              <AlertDescription className="text-green-400">
                {success}
                <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-2 text-green-400">
                  ✕
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-800/90 border-gray-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  Total Inscripciones
                </CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {totalPayments}
                </div>
                <p className="text-xs text-gray-400">
                  Inscripciones registradas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/90 border-gray-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  Pagos Completados
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {paidPayments}
                </div>
                <p className="text-xs text-gray-400">
                  {totalPayments > 0 ? `${((paidPayments / totalPayments) * 100).toFixed(1)}% completado` : '0% completado'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/90 border-gray-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  Pendientes
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">
                  {pendingPayments + reviewPayments}
                </div>
                <p className="text-xs text-gray-400">
                  {reviewPayments} en revisión
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/90 border-gray-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  Total Recaudado
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(paidAmount)}
                </div>
                <p className="text-xs text-gray-400">
                  De {formatCurrency(totalAmount)} esperado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="border-gray-600 bg-gray-800/90">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros y Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search" className="text-gray-300">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-gray-300">Estado</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="PENDING_REVIEW">En Revisión</SelectItem>
                      <SelectItem value="PAID">Pagado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sport" className="text-gray-300">Deporte</Label>
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Todos los deportes" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all">Todos los deportes</SelectItem>
                      <SelectItem value="DANCE">Baile</SelectItem>
                      <SelectItem value="VOLLEYBALL">Voleibol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="limit" className="text-gray-300">Por página</Label>
                  <Select value={limit.toString()} onValueChange={(value) => handleLimitChange(parseInt(value))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pagos */}
          <Card className="border-gray-600 bg-gray-800/90">
            <CardHeader>
              <CardTitle className="text-white">
                Pagos de Inscripción ({pagination.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No se encontraron pagos de inscripción</p>
                  <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => {
                    const studentInitial = payment.studentName.charAt(0).toUpperCase();
                    return (
                      <div
                        key={payment.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-600 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold">
                              {studentInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-white font-semibold">{payment.studentName}</h3>
                            <p className="text-gray-400 text-sm">{payment.studentPhone}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge className="bg-blue-500 text-white">
                                {getSportLabel(payment.sport)}
                              </Badge>
                              <Badge className={getStatusBadgeColor(payment.status)}>
                                {getStatusLabel(payment.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0 sm:flex-nowrap sm:items-center sm:space-x-3">
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              {formatCurrency(payment.expectedAmount)}
                            </p>
                            {payment.paidAmount && (
                              <p className="text-green-400 text-sm">
                                Pagado: {formatCurrency(payment.paidAmount)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
                            {!payment.hasActiveForm && payment.status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendWhatsApp(payment.studentId)}
                                disabled={sendingWhatsApp === payment.studentId}
                                className="border-blue-600 text-blue-400 hover:bg-blue-900/50"
                              >
                                {sendingWhatsApp === payment.studentId ? (
                                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                                ) : (
                                  <Send className="h-3 w-3 mr-1" />
                                )}
                                WhatsApp
                              </Button>
                            )}
                            {payment.hasProof && (
                              <Link href={`/admin/payment-proofs/pending`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/50"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Revisar
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <AdvancedPagination
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="pagos de inscripción"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function EnrollmentPaymentsPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <EnrollmentPaymentsContent />
    </AuthGuard>
  );
} 