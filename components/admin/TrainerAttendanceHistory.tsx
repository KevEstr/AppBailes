"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  Calendar as CalendarIcon,
  User as UserIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as AlertIcon,
  X as XIcon,
  RefreshCw as RefreshIcon,
  TrendingUp,
  BarChart3,
  Search,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { Download } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

interface TrainerAttendance {
  id: number;
  status: "PRESENT" | "LATE" | "ABSENT" | "CHANGE_REQUEST";
  date: string;
  notes?: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
  class: {
    id: number;
    name: string;
  trainer: {
    id: number;
    name: string;
    };
  };
}

interface Trainer {
  id: number;
  name: string;
  userId: number | null;
  user: {
    id: number;
    email: string;
  } | null;
}

interface AttendanceData {
  date: string;
  present: number;
  late: number;
  absent: number;
}

interface UserStats {
  id: number;
  email: string;
  role: string;
  totalClasses: number;
  present: number;
  late: number;
  absent: number;
  percentage: number;
}

export default function TrainerAttendanceHistory() {
  const { toast } = useToast();
  const [attendances, setAttendances] = useState<TrainerAttendance[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [isDownloading, setIsDownloading] = useState(false);

  // Cargar trainers
  const loadTrainers = async () => {
    try {
      const response = await fetch("/api/trainers");
      const data = await response.json();
      if (data.success) {
        setTrainers(data.trainers);
      }
    } catch (error) {
      console.error("Error loading trainers:", error);
    }
  };

  // Cargar asistencias
  const loadAttendances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString()
      });
      
      if (selectedTrainer && selectedTrainer !== "all") {
        // Buscar el trainer seleccionado para obtener su userId
        // En trainerAttendance se guarda el userId (ID del usuario), no el trainerId
        const selectedTrainerData = trainers.find(t => t.id.toString() === selectedTrainer);
        if (selectedTrainerData?.userId) {
          params.append("userId", selectedTrainerData.userId.toString());
        }
      }
      // fecha exacta eliminada: solo rango
      if (dateRange?.from) {
        const y = dateRange.from.getFullYear();
        const m = (dateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const d = dateRange.from.getDate().toString().padStart(2, '0');
        params.append("startDate", `${y}-${m}-${d}`);
      }
      if (dateRange?.to) {
        const y = dateRange.to.getFullYear();
        const m = (dateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const d = dateRange.to.getDate().toString().padStart(2, '0');
        params.append("endDate", `${y}-${m}-${d}`);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/trainer-attendance?${params}`);
      const data = await response.json();
      
      if (data.success) {
        let filteredAttendances = data.attendances;
        
        // Filtrar por status si está seleccionado
        if (selectedStatus && selectedStatus !== "all") {
          filteredAttendances = filteredAttendances.filter(
            (att: TrainerAttendance) => att.status === selectedStatus
          );
        }
        
        setAttendances(filteredAttendances);
        
        // Procesar datos para gráficos
        processAttendanceData(filteredAttendances);
        processUserStats(filteredAttendances);
        
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las asistencias",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading attendances:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las asistencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (attendances: TrainerAttendance[]) => {
    const dataMap = new Map<string, { present: number; late: number; absent: number }>();
    
    attendances.forEach(att => {
      const date = new Date(att.date).toLocaleDateString("es-ES", { 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit' 
      });
      
      if (!dataMap.has(date)) {
        dataMap.set(date, { present: 0, late: 0, absent: 0 });
      }
      
      const dayData = dataMap.get(date)!;
      if (att.status === "PRESENT") dayData.present++;
      else if (att.status === "LATE") dayData.late++;
      else if (att.status === "ABSENT") dayData.absent++;
    });
    
    const chartData = Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));
    
    setAttendanceData(chartData);
  };

  const processUserStats = (attendances: TrainerAttendance[]) => {
    const userMap = new Map<number, { 
      email: string; 
      role: string; 
      present: number; 
      late: number; 
      absent: number; 
      total: number; 
    }>();
    
    attendances.forEach(att => {
      const userId = att.user.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, { 
          email: att.user.email, 
          role: att.user.role, 
          present: 0, 
          late: 0, 
          absent: 0, 
          total: 0 
        });
      }
      
      const userData = userMap.get(userId)!;
      userData.total++;
      if (att.status === "PRESENT") userData.present++;
      else if (att.status === "LATE") userData.late++;
      else if (att.status === "ABSENT") userData.absent++;
    });
    
    const stats = Array.from(userMap.entries()).map(([id, data]) => ({
      id,
      email: data.email,
      role: data.role,
      totalClasses: data.total,
      present: data.present,
      late: data.late,
      absent: data.absent,
      percentage: data.total > 0 ? ((data.present / data.total) * 100) : 0
    }));
    
    setUserStats(stats);
  };

  useEffect(() => {
    loadTrainers();
  }, []);

  useEffect(() => {
    loadAttendances();
  }, [selectedTrainer, selectedStatus, dateRange, currentPage, pageLimit]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "LATE":
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case "ABSENT":
        return <XIcon className="h-4 w-4 text-red-500" />;
      case "CHANGE_REQUEST":
        return <AlertIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "Presente";
      case "LATE":
        return "Tarde";
      case "ABSENT":
        return "Ausente";
      case "CHANGE_REQUEST":
        return "Cambio";
      default:
        return "Desconocido";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Presente</Badge>;
      case "LATE":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Tarde</Badge>;
      case "ABSENT":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Ausente</Badge>;
      case "CHANGE_REQUEST":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Cambio</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearFilters = () => {
    setSelectedTrainer("all");
    setSelectedStatus("all");
    setDateRange(undefined);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    try {
      // Validar al menos un filtro: fecha, usuario o búsqueda
      const hasDateFilter = !!(dateRange?.from || dateRange?.to);
      const hasTrainerFilter = selectedTrainer && selectedTrainer !== "all";
      const hasSearchFilter = searchTerm && searchTerm.trim() !== "";

      if (!hasDateFilter && !hasTrainerFilter && !hasSearchFilter) {
        toast({
          title: "⚠️ Filtro requerido",
          description: "Debe seleccionar al menos un filtro (fecha, usuario o búsqueda) para exportar",
          variant: "destructive",
        });
        return;
      }

      setIsDownloading(true);
      const params = new URLSearchParams();

      // sin fecha exacta; usar startDate/endDate
      if (dateRange?.from) {
        const y = dateRange.from.getFullYear();
        const m = (dateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const d = dateRange.from.getDate().toString().padStart(2, '0');
        params.set("startDate", `${y}-${m}-${d}`);
      }
      if (dateRange?.to) {
        const y = dateRange.to.getFullYear();
        const m = (dateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const d = dateRange.to.getDate().toString().padStart(2, '0');
        params.set("endDate", `${y}-${m}-${d}`);
      }
      if (hasTrainerFilter) {
        const selectedTrainerData = trainers.find(t => t.id.toString() === selectedTrainer);
        if (selectedTrainerData?.userId) {
          params.set("userId", selectedTrainerData.userId.toString());
        }
      }
      if (hasSearchFilter) params.set("search", searchTerm.trim());

      const response = await fetch(`/api/trainer-attendance/export-excel?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar asistencia de entrenadores');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'asistencia_entrenadores.xlsx';
      if (contentDisposition) {
        const filenameRegex = /filename=\"(.+)\"/;
        const filenameMatch = filenameRegex.exec(contentDisposition);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Archivo descargado",
        description: `Archivo ${filename} descargado exitosamente`
      });
    } catch (error) {
      console.error('Error downloading trainer attendance Excel file:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error al descargar archivo Excel',
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-300";
    if (percentage >= 75) return "text-amber-300";
    return "text-red-300";
  };

  const getPercentageBadge = (percentage: number) => {
    if (percentage >= 90) return "default";
    if (percentage >= 75) return "secondary";
    return "destructive";
  };

  const pieData = [
    { name: "Presentes", value: attendanceData.reduce((sum, day) => sum + day.present, 0), color: "#10B981" },
    { name: "Tarde", value: attendanceData.reduce((sum, day) => sum + day.late, 0), color: "#F59E0B" },
    { name: "Ausentes", value: attendanceData.reduce((sum, day) => sum + day.absent, 0), color: "#EF4444" },
  ].filter(item => item.value > 0);

  const hasAttendanceData = pieData.length > 0;

  return (
    <div>
      {/* Filtros */}
      <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:flex-wrap items-center md:items-end gap-4">
            <div className="w-full md:flex-1 min-w-[240px]">
              <h2 className="text-lg font-bold text-gray-200 mb-1">Rango de Fechas</h2>
              <DateRangePicker
                dateRange={dateRange as any}
                onDateRangeChange={setDateRange as any}
                placeholder="Seleccionar rango de fechas"
              />
            </div>

            <div className="w-full md:flex-1 min-w-[220px]">
              <h2 className="text-lg font-bold text-gray-200 mb-1">Usuario</h2>
              <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-blue-600">
                    👥 Todos los usuarios
                  </SelectItem>
                  {trainers
                    .filter(trainer => trainer.userId) // Solo mostrar trainers con usuario asociado
                    .map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id.toString()} className="text-white hover:bg-blue-600">
                      👨‍🏫 {trainer.name} {trainer.user?.email ? `(${trainer.user.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-[220px] min-w-[200px]">
              <h2 className="text-lg font-bold text-gray-200 mb-1">Estado</h2>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-blue-600">
                    📊 Todos los estados
                  </SelectItem>
                  <SelectItem value="PRESENT" className="text-white hover:bg-blue-600">
                    ✅ Presente
                  </SelectItem>
                  <SelectItem value="LATE" className="text-white hover:bg-blue-600">
                    ⏰ Tarde
                  </SelectItem>
                  <SelectItem value="ABSENT" className="text-white hover:bg-blue-600">
                    ❌ Ausente
                  </SelectItem>
                  <SelectItem value="CHANGE_REQUEST" className="text-white hover:bg-blue-600">
                    🔄 Cambio
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 w-full md:w-auto md:ml-auto">
              <Button
                onClick={handleExportExcel}
                disabled={isDownloading || (!dateRange?.from && !dateRange?.to && selectedTrainer === 'all')}
                variant="outline"
                className="border-green-600 text-green-400"
                title={(!dateRange?.from && !dateRange?.to && selectedTrainer === 'all') ? "Seleccione al menos un filtro para exportar" : "Exportar asistencia filtrada"}
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" /> Exportar Excel
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Gráfico de barras */}
        <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-white">
              <CalendarIcon className="w-6 h-6" />
              <span className="text-2xl font-bold">
                Asistencia por Día
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b" />
                <XAxis dataKey="date" stroke="#475569" />
                <YAxis stroke="#475569" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#44403c",
                    border: "none",
                    borderRadius: "16px",
                    color: "white",
                  }}
                />
                <Bar dataKey="present" fill="#10B981" name="Presentes" radius={[6, 6, 0, 0]} />
                <Bar dataKey="late" fill="#F59E0B" name="Tarde" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" fill="#EF4444" name="Ausentes" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico circular */}
        <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-white">
              <TrendingUp className="w-6 h-6" />
              <span className="text-2xl font-bold">
                Distribución General
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAttendanceData ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                  <PieChart className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Sin datos de asistencia</h3>
                <p className="text-sm text-gray-400 max-w-[250px]">
                  No hay registros de asistencia para el período seleccionado
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    dataKey="value"
                    labelLine={true}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "0.75rem",
                      padding: "0.75rem",
                      color: "white",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                    }}
                    formatter={(value, name) => [`${value} registros`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => (
                      <span style={{ color: "white", marginLeft: "0.5rem" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-white">
            <Users className="w-6 h-6" />
            <span className="text-2xl font-bold">
              Estadísticas por Usuario
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-teal-300 to-amber-300 rounded-full flex items-center justify-center border-2 border-teal-600">
                  <BarChart3 className="w-12 h-12 text-teal-800" />
            </div>
                <h3 className="text-2xl font-bold text-teal-800 mb-2">Sin datos disponibles</h3>
                <p className="text-slate-700">No hay estadísticas para el período seleccionado</p>
            </div>
          ) : (
              userStats.map((user) => (
                <Card key={user.id} className="bg-gray-700/80 border border-gray-600 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 ring-4 ring-teal-600/60 shadow-lg">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg">
                            {user.email
                              .split("@")[0]
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-base font-medium text-white">{user.email}</h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {user.role} • {user.totalClasses} registros totales
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-lg font-bold mb-2 ${getPercentageColor(user.percentage)}`}>
                          {user.percentage.toFixed(1)}%
                        </div>
                        <Badge
                          variant={getPercentageBadge(user.percentage) as any}
                          className="text-sm px-3 py-1"
                        >
                          {user.percentage >= 90 ? "Excelente" : user.percentage >= 75 ? "Regular" : "Necesita mejorar"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-emerald-900/30 rounded-xl border border-emerald-600/40">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
                          <span className="text-sm font-medium text-emerald-200">Presentes</span>
                        </div>
                        <div className="text-base font-semibold text-emerald-300">{user.present}</div>
                      </div>

                      <div className="text-center p-3 bg-amber-900/30 rounded-xl border border-amber-600/40">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <ClockIcon className="w-5 h-5 text-amber-300" />
                          <span className="text-sm font-medium text-amber-200">Tarde</span>
                        </div>
                        <div className="text-base font-semibold text-amber-300">{user.late}</div>
                          </div>

                      <div className="text-center p-3 bg-red-900/30 rounded-xl border border-red-600/40">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <XIcon className="w-5 h-5 text-red-300" />
                          <span className="text-sm font-medium text-red-200">Ausentes</span>
                        </div>
                        <div className="text-base font-semibold text-red-300">{user.absent}</div>
                        </div>
                        </div>
                  </CardContent>
                </Card>
              ))
            )}
            </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <AdvancedPagination
              pagination={{
                page: pagination.page,
                limit: pagination.limit,
                totalCount: pagination.total,
                totalPages: pagination.totalPages,
                hasNext: pagination.page < pagination.totalPages,
                hasPrev: pagination.page > 1
              }}
              currentPage={currentPage}
              onPageChange={(page) => setCurrentPage(page)}
              onLimitChange={(newLimit) => { setPageLimit(newLimit); setCurrentPage(1); }}
              itemName="usuarios"
              limitOptions={[10, 25, 50, 100]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
