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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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
  enrollmentPayments: {
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

export function FinancialDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

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
                      Inscripciones
                    </CardTitle>
                    <FileText className="h-4 w-4 text-orange-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-400">
                      {formatCurrency(
                        dashboardData.summary.enrollmentPayments.amount
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {dashboardData.summary.enrollmentPayments.count} inscripciones
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
