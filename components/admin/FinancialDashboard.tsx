"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Download,
  BarChart3,
  PieChart,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddExpenseModal } from "@/components/admin/AddExpenseModal";

interface FinancialSummary {
  totalIncome: number;
  totalTransactions: number;
  monthlyPayments: {
    amount: number;
    count: number;
  };
  servicePayments: {
    amount: number;
    count: number;
  };
}

interface RecentTransaction {
  id: number;
  amount: number;
  concept: string;
  paymentMethod: string;
  studentName: string;
  createdAt: Date;
}

interface DashboardData {
  period: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
  summary: FinancialSummary;
  recentTransactions: RecentTransaction[];
}

interface FinancialReport {
  id: number;
  reportType: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  monthlyPayments: number;
  servicePayments: number;
  generatedAt: Date;
  period: {
    year: number;
    month: number;
  };
}

interface ConsolidatedTransaction {
  source_table: string;
  transaction_id: string;
  amount: number;
  description: string;
  transaction_type: string;
  category: string;
  transaction_date: string;
  payment_method: string | null;
  student_id: string | null;
  period_id: string | null;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
  updated_at: string;
}

interface ConsolidatedData {
  transactions: ConsolidatedTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  totals?: {
    total_income: number;
    total_expense: number;
    total_pending_liability: number;
  };
}

export function FinancialDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Estados para la tabla consolidada
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  useEffect(() => {
    if (activeTab === "consolidated") {
      loadConsolidatedData();
    }
  }, [activeTab, currentPage, pageLimit, searchTerm, filterType, filterCategory, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadDashboard(), loadReports()]);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos financieros");
    } finally {
      setLoading(false);
    }
  };

  const loadConsolidatedData = async () => {
    try {
      setLoadingConsolidated(true);
      const params = new URLSearchParams({
        view: "consolidated",
        page: currentPage.toString(),
        limit: pageLimit.toString(),
      });
      
      if (searchTerm) params.append("search", searchTerm);
      if (filterType !== "ALL") params.append("type", filterType);
      if (filterCategory !== "ALL") params.append("category", filterCategory);
      if (dateRange?.from) {
        const year = dateRange.from.getFullYear();
        const month = (dateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = dateRange.from.getDate().toString().padStart(2, '0');
        params.append("startDate", `${year}-${month}-${day}`);
      }
      if (dateRange?.to) {
        const year = dateRange.to.getFullYear();
        const month = (dateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = dateRange.to.getDate().toString().padStart(2, '0');
        params.append("endDate", `${year}-${month}-${day}`);
      }

      const response = await fetch(`/api/admin/financial-reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConsolidatedData(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos consolidados");
    } finally {
      setLoadingConsolidated(false);
    }
  };

  const loadDashboard = async () => {
    const response = await fetch(
      `/api/admin/financial-dashboard?period=${selectedPeriod}`
    );
    if (response.ok) {
      const data = await response.json();
      setDashboardData(data);
    }
  };

  const loadReports = async () => {
    const response = await fetch("/api/admin/financial-reports");
    if (response.ok) {
      const data = await response.json();
      setReports(data);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const now = new Date();
      const response = await fetch("/api/admin/financial-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          reportType: "MONTHLY",
        }),
      });

      if (response.ok) {
        await loadReports();
        toast.success("Reporte generado exitosamente");
      } else {
        const error = await response.json();
        toast.error(error.message || "Error al generar reporte");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al generar reporte");
    } finally {
      setGenerating(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      CASH: "text-green-400",
      TRANSFER: "text-blue-400",
      CARD: "text-purple-400",
    };
    return colors[method] || "text-gray-400";
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: "Efectivo",
      TRANSFER: "Transferencia",
      CARD: "Tarjeta",
    };
    return labels[method] || method;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INCOME: "text-green-400",
      EXPENSE: "text-red-400",
      PENDING_LIABILITY: "text-yellow-400",
      PENDING_REVIEW: "text-orange-400",
      REJECTED: "text-red-600",
      CANCELLED: "text-gray-400",
      FAILED: "text-red-500",
    };
    return colors[type] || "text-gray-400";
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INCOME: "Ingreso",
      EXPENSE: "Egreso",
      PENDING_LIABILITY: "Pasivo Pendiente",
      PENDING_REVIEW: "Pendiente Revisión",
      REJECTED: "Rechazado",
      CANCELLED: "Cancelado",
      FAILED: "Fallido",
    };
    return labels[type] || type;
  };

  const getSourceTableLabel = (source: string) => {
    const labels: Record<string, string> = {
      RECEIPT: "Recibo",
      DEBT: "Deuda",
      MONTHLY_PAYMENT: "Mensualidad",
      PAYMENT_PROOF: "Comprobante",
      ENROLLMENT_PAYMENT: "Inscripción",
      ENROLLMENT_PAYMENT_PROOF: "Comp. Inscripción",
      SERVICE_PAYMENT: "Servicio",
      FINANCIAL_TRANSACTION: "Transacción",
      // Categorías de transacciones financieras
      EQUIPMENT: "Equipos",
      MARKETING: "Marketing",
      RENT: "Alquiler",
      UTILITIES: "Servicios Públicos",
      SALARIES: "Salarios",
      OTHER_INCOME: "Otros Ingresos",
      OTHER_EXPENSE: "Otros Gastos",
    };
    return labels[source] || source;
  };

  const formatDate = (dateString: string) => {
    // Parsear la fecha manualmente para evitar conversiones de zona horaria
    // La fecha viene de la base de datos y debe mostrarse exactamente como está
    const [datePart, timePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Crear fecha en zona horaria local sin conversión
    const date = new Date(year, month - 1, day, hours, minutes);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (limit: number) => {
    setPageLimit(limit);
    setCurrentPage(1); // Reset to first page when changing limit
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("ALL");
    setFilterCategory("ALL");
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (range) {
      case "today":
        start = new Date(today);
        end = new Date(today);
        break;
      case "week":
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date(today);
        break;
      case "month":
        start = new Date(today);
        start.setMonth(today.getMonth() - 1);
        end = new Date(today);
        break;
      case "quarter":
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        end = new Date(today);
        break;
      case "year":
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        end = new Date(today);
        break;
      default:
        return;
    }

    setDateRange({ from: start, to: end });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">
            Consolidado Financiero
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Año</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={generateReport}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generating ? "Generando..." : "Generar Reporte"}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-gray-800 border-gray-600">
          <TabsTrigger value="dashboard" className="text-white">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="consolidated" className="text-white">
            Consolidado
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-white">
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {dashboardData && (
            <>
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gray-800/90 border-gray-600">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">
                      Ingresos Totales
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(dashboardData.summary.totalIncome)}
                    </div>
                    <p className="text-xs text-gray-400">
                      {dashboardData.summary.totalTransactions} transacciones
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/90 border-gray-600">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">
                      Mensualidades
                    </CardTitle>
                    <Receipt className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-400">
                      {formatCurrency(
                        dashboardData.summary.monthlyPayments.amount
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {dashboardData.summary.monthlyPayments.count} pagos
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/90 border-gray-600">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">
                      Servicios
                    </CardTitle>
                    <Users className="h-4 w-4 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-400">
                      {formatCurrency(
                        dashboardData.summary.servicePayments.amount
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {dashboardData.summary.servicePayments.count} servicios
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/90 border-gray-600">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white">
                      Crecimiento
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-400">
                      +12.5%
                    </div>
                    <p className="text-xs text-gray-400">
                      vs. período anterior
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transacciones recientes */}
              <Card className="bg-gray-800/90 border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">
                    Transacciones Recientes
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCSV(
                        dashboardData.recentTransactions,
                        "transacciones.csv"
                      )
                    }
                    className="border-gray-600 text-gray-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentTransactions.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">
                        No hay transacciones recientes
                      </p>
                    ) : (
                      dashboardData.recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                                <Receipt className="h-5 w-5 text-gray-300" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {transaction.concept}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {transaction.studentName}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p
                              className={`text-sm ${getPaymentMethodColor(
                                transaction.paymentMethod
                              )}`}
                            >
                              {getPaymentMethodLabel(transaction.paymentMethod)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="consolidated" className="space-y-6">
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Consolidado Financiero</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Resumen estadístico */}
              {consolidatedData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-green-950/30 border-green-600/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-300">Total Ingresos</p>
                          <p className="text-2xl font-bold text-green-400">
                            {formatCurrency(
                              dateRange?.from || dateRange?.to
                                ? (consolidatedData.totals?.total_income ?? 0)
                                : consolidatedData.transactions
                                    .filter(t => t.transaction_type === 'INCOME')
                                    .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                        </div>
                        <ArrowUpRight className="h-8 w-8 text-green-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-950/30 border-red-600/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-300">Total Egresos</p>
                          <p className="text-2xl font-bold text-red-400">
                            {formatCurrency(
                              dateRange?.from || dateRange?.to
                                ? (consolidatedData.totals?.total_expense ?? 0)
                                : consolidatedData.transactions
                                    .filter(t => t.transaction_type === 'EXPENSE')
                                    .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                        </div>
                        <ArrowDownRight className="h-8 w-8 text-red-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-950/30 border-yellow-600/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-300">Pasivos Pendientes</p>
                          <p className="text-2xl font-bold text-yellow-400">
                            {formatCurrency(
                              dateRange?.from || dateRange?.to
                                ? (consolidatedData.totals?.total_pending_liability ?? 0)
                                : consolidatedData.transactions
                                    .filter(t => t.transaction_type === 'PENDING_LIABILITY')
                                    .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                        </div>
                        <Receipt className="h-8 w-8 text-yellow-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-950/30 border-blue-600/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-300">Balance Neto</p>
                          <p className={`text-2xl font-bold ${
                            ((dateRange?.from || dateRange?.to)
                              ? ((consolidatedData.totals?.total_income ?? 0) - (consolidatedData.totals?.total_expense ?? 0))
                              : (consolidatedData.transactions
                                  .filter(t => t.transaction_type === 'INCOME')
                                  .reduce((sum, t) => sum + t.amount, 0) -
                                consolidatedData.transactions
                                  .filter(t => t.transaction_type === 'EXPENSE')
                                  .reduce((sum, t) => sum + t.amount, 0))) >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {formatCurrency(
                              (dateRange?.from || dateRange?.to)
                                ? ((consolidatedData.totals?.total_income ?? 0) - (consolidatedData.totals?.total_expense ?? 0))
                                : (consolidatedData.transactions
                                    .filter(t => t.transaction_type === 'INCOME')
                                    .reduce((sum, t) => sum + t.amount, 0) -
                                  consolidatedData.transactions
                                    .filter(t => t.transaction_type === 'EXPENSE')
                                    .reduce((sum, t) => sum + t.amount, 0))
                            )}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filtros */}
              <div className="space-y-4 mb-6">
                {/* Primera línea: Búsqueda, Tipo y Categoría */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="lg:col-span-3 md:col-span-3 sm:col-span-12 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div className="lg:col-span-3 md:col-span-3 sm:col-span-12">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Tipo de transacción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos los tipos</SelectItem>
                        <SelectItem value="INCOME">Ingresos</SelectItem>
                        <SelectItem value="EXPENSE">Egresos</SelectItem>
                        <SelectItem value="PENDING_LIABILITY">Pasivos</SelectItem>
                        <SelectItem value="PENDING_REVIEW">Pendientes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-3 md:col-span-3 sm:col-span-12">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas las categorías</SelectItem>
                        <SelectItem value="RECEIPT">Recibos</SelectItem>
                        <SelectItem value="MONTHLY_PAYMENT">Mensualidades</SelectItem>
                        <SelectItem value="ENROLLMENT_PAYMENT">Inscripciones</SelectItem>
                        <SelectItem value="SERVICE_PAYMENT">Servicios</SelectItem>
                        <SelectItem value="DEBT">Deudas</SelectItem>
                        <SelectItem value="PAYMENT_PROOF">Comprobantes</SelectItem>
                        <SelectItem value="EQUIPMENT">Equipos</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="RENT">Alquiler</SelectItem>
                        <SelectItem value="UTILITIES">Servicios Públicos</SelectItem>
                        <SelectItem value="SALARIES">Salarios</SelectItem>
                        <SelectItem value="OTHER_INCOME">Otros Ingresos</SelectItem>
                        <SelectItem value="OTHER_EXPENSE">Otros Gastos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-3 md:col-span-3 sm:col-span-12">
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                      placeholder="Seleccionar rango de fechas"
                      className="w-full"
                    />
                  </div>

                </div>
              </div>

              {/* Presets de fechas rápidas y botón limpiar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange("today")}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange("week")}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Última semana
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange("month")}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Último mes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange("quarter")}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Último trimestre
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange("year")}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Último año
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <AddExpenseModal onExpenseAdded={loadConsolidatedData} />
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                </div>
              </div>

              {/* Tabla */}
              <div className="border border-gray-600 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-700 hover:bg-gray-700">
                      <TableHead className="text-white">Origen</TableHead>
                      <TableHead className="text-white">Descripción</TableHead>
                      <TableHead className="text-white">Tipo</TableHead>
                      <TableHead className="text-white">Categoría</TableHead>
                      <TableHead className="text-white">Monto</TableHead>
                      <TableHead className="text-white">Método</TableHead>
                      <TableHead className="text-white">Fecha</TableHead>
                      <TableHead className="text-white">Estudiante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingConsolidated ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : consolidatedData?.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          No se encontraron transacciones
                        </TableCell>
                      </TableRow>
                    ) : (
                      consolidatedData?.transactions.map((transaction) => (
                        <TableRow key={transaction.transaction_id} className="hover:bg-gray-700/50">
                          <TableCell>
                            <Badge variant="outline" className="border-gray-500 text-gray-300">
                              {getSourceTableLabel(transaction.source_table)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${
                                transaction.transaction_type === 'INCOME' 
                                  ? 'bg-green-600' 
                                  : transaction.transaction_type === 'EXPENSE'
                                  ? 'bg-red-600'
                                  : 'bg-yellow-600'
                              } text-white`}
                            >
                              {getTransactionTypeLabel(transaction.transaction_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {getSourceTableLabel(transaction.category)}
                          </TableCell>
                          <TableCell className={`font-bold ${
                            transaction.transaction_type === 'INCOME' 
                              ? 'text-green-400' 
                              : transaction.transaction_type === 'EXPENSE'
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}>
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {transaction.payment_method ? getPaymentMethodLabel(transaction.payment_method) : '-'}
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {formatDate(transaction.transaction_date)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {transaction.student_id || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {consolidatedData && consolidatedData.transactions.length > 0 && (
                <AdvancedPagination
                  pagination={{
                    page: consolidatedData.pagination.page,
                    limit: consolidatedData.pagination.limit,
                    totalCount: consolidatedData.pagination.total,
                    totalPages: consolidatedData.pagination.totalPages,
                    hasNext: currentPage < consolidatedData.pagination.totalPages,
                    hasPrev: currentPage > 1
                  }}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  itemName="transacciones"
                  limitOptions={[25, 50, 100, 200]}
                />
              )}

              {/* Botón exportar */}
              {consolidatedData && consolidatedData.transactions.length > 0 && (
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => exportToCSV(
                      consolidatedData.transactions,
                      `consolidado-financiero-${new Date().toISOString().split('T')[0]}.csv`
                    )}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Consolidado
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Lista de reportes */}
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Reportes Financieros</span>
              </CardTitle>
              <Badge className="bg-purple-600 text-white">
                {reports.length} reportes
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No hay reportes generados</p>
                    <Button
                      onClick={generateReport}
                      className="mt-4 bg-purple-600 hover:bg-purple-700"
                      disabled={generating}
                    >
                      {generating ? "Generando..." : "Generar Primer Reporte"}
                    </Button>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-white font-semibold">
                            Reporte {report.reportType} - {report.period.month}/
                            {report.period.year}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            Generado el{" "}
                            {new Date(report.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-white">
                          {formatCurrency(report.netProfit)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-950/50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <ArrowUpRight className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-green-300">
                              Ingresos
                            </span>
                          </div>
                          <div className="text-lg font-bold text-green-400">
                            {formatCurrency(report.totalIncome)}
                          </div>
                        </div>

                        <div className="text-center p-3 bg-red-950/50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                            <span className="text-sm text-red-300">Gastos</span>
                          </div>
                          <div className="text-lg font-bold text-red-400">
                            {formatCurrency(report.totalExpenses)}
                          </div>
                        </div>

                        <div className="text-center p-3 bg-blue-950/50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-blue-300">
                              Ganancia
                            </span>
                          </div>
                          <div className="text-lg font-bold text-blue-400">
                            {formatCurrency(report.netProfit)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            exportToCSV(
                              [report],
                              `reporte-${report.period.month}-${report.period.year}.csv`
                            )
                          }
                          className="border-gray-600 text-gray-300"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
