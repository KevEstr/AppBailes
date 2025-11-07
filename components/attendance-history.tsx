"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateLongWithoutTimezone, formatDateOnlyWithoutTimezone } from "@/lib/date-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Calendar, CheckCircle, Clock, XCircle, BarChart3, Search, Trophy, Users, Download, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { AdvancedPagination } from "@/components/ui/advanced-pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface AttendanceData {
  date: string
  present: number
  late: number
  absent: number
}

interface StudentStats {
  id: number // Cédula del estudiante
  name: string
  avatar: string
  totalClasses: number
  present: number
  late: number
  absent: number
  percentage: number
}

interface StudentAttendanceDetail {
  id: number
  date: string
  status: string
  session: {
    id: number
    date: string
    danceClass: {
      id: number
      name: string
      sport: string
      trainer: {
        name: string
      }
    }
  }
}

interface MatchAttendanceDetail {
  id: number
  status: string
  match: {
    id: number
    matchDate: string
    notes?: string
    status: string
    danceClass: {
      id: number
      name: string
      sport: string
      trainer: {
        name: string
      }
    }
  }
}

interface StudentWithConsecutiveAbsences {
  id: string
  name: string
  avatar: string
  consecutiveAbsences: number
  lastAbsenceDate: string
  class?: {
    id: number
    name: string
    sport: string
  }
}

interface AvailableClass {
  id: number
  name: string
  sport: string
  trainer: {
    name: string
  }
}

interface SelectedClassInfo {
  id: number
  name: string
  sport: string
  description?: string
  trainer: {
    name: string
  }
  sessions: {
    date: string
  }[]
}


// Interfaces para partidos
interface MatchData {
  id: number
  matchDate: string
  notes?: string
  status: string
  danceClass: {
    id: number
    name: string
    sport: string
    trainer: {
      name: string
    }
  }
  attendances: {
    id: number
    status: string
    student: {
      id: string
      name: string
    }
  }[]
}

interface MatchStats {
  id: number // Cédula del estudiante
  name: string
  avatar: string
  totalMatches: number
  present: number
  late: number
  absent: number
  percentage: number
}

interface AvailableMatch {
  id: number
  matchDate: string
  status: string
  danceClass: {
    name: string
    sport: string
  }
  attendances: any[]
}

interface SelectedMatchInfo {
  id: number
  matchDate: string
  notes?: string
  status: string
  danceClass: {
    id: number
    name: string
    sport: string
    trainer: {
      name: string
    }
  }
  attendances: {
    id: number
    status: string
    student: {
      id: string
      name: string
    }
  }[]
}

export function AttendanceHistory() {
  // Estado para clases normales
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedStudent, setSelectedStudent] = useState<string>("all")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [studentStats, setStudentStats] = useState<StudentStats[]>([])
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([])
  const [selectedClassInfo, setSelectedClassInfo] = useState<SelectedClassInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(25)
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false })

  // Estado para partidos
  const [matchDateRange, setMatchDateRange] = useState<DateRange | undefined>()
  const [selectedMatchStudent, setSelectedMatchStudent] = useState<string>("all")
  const [selectedMatch, setSelectedMatch] = useState<string>("all")
  const [matchAttendanceData, setMatchAttendanceData] = useState<AttendanceData[]>([])
  const [matchStats, setMatchStats] = useState<MatchStats[]>([])
  const [availableMatches, setAvailableMatches] = useState<AvailableMatch[]>([])
  const [selectedMatchInfo, setSelectedMatchInfo] = useState<SelectedMatchInfo | null>(null)
  const [currentMatchPage, setCurrentMatchPage] = useState(1)
  const [matchPageLimit, setMatchPageLimit] = useState(25)
  const [matchSearchTerm, setMatchSearchTerm] = useState("")
  const [matchPagination, setMatchPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false })

  // Estado para el tab activo
  const [activeTab, setActiveTab] = useState("classes")
  
  // Estado para descarga de Excel
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingEvents, setIsDownloadingEvents] = useState(false)
  
  // Estado para el modal de detalles del estudiante (clases)
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentStats | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [studentAttendanceDetails, setStudentAttendanceDetails] = useState<StudentAttendanceDetail[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  
  // Estado para el modal de detalles del estudiante (eventos)
  const [selectedMatchStudentForDetail, setSelectedMatchStudentForDetail] = useState<MatchStats | null>(null)
  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false)
  const [matchAttendanceDetails, setMatchAttendanceDetails] = useState<MatchAttendanceDetail[]>([])
  const [isLoadingMatchDetails, setIsLoadingMatchDetails] = useState(false)
  
  // Estado para estudiantes con faltas consecutivas
  const [studentsWithConsecutiveAbsences, setStudentsWithConsecutiveAbsences] = useState<StudentWithConsecutiveAbsences[]>([])
  const [isLoadingConsecutiveAbsences, setIsLoadingConsecutiveAbsences] = useState(false)
  const [matchStudentsWithConsecutiveAbsences, setMatchStudentsWithConsecutiveAbsences] = useState<StudentWithConsecutiveAbsences[]>([])
  const [isLoadingMatchConsecutiveAbsences, setIsLoadingMatchConsecutiveAbsences] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    if (activeTab === "classes") {
      loadAttendanceData()
      loadConsecutiveAbsences()
    }
  }, [dateRange, selectedStudent, selectedClass, currentPage, pageLimit, activeTab])

  useEffect(() => {
    if (activeTab === "matches") {
      loadMatchData()
      loadMatchConsecutiveAbsences()
    }
  }, [matchDateRange, selectedMatchStudent, selectedMatch, currentMatchPage, matchPageLimit, activeTab])


  const loadAttendanceData = async () => {
    try {
      const params = new URLSearchParams({
        student: selectedStudent,
        class: selectedClass,
        page: currentPage.toString(),
        limit: pageLimit.toString()
      })
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
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
      const response = await fetch(`/api/attendance-history?${params}`)
      const data = await response.json()
      setAttendanceData(data.chartData)
      setStudentStats(data.studentStats)
      setAvailableClasses(data.availableClasses || [])
      setSelectedClassInfo(data.selectedClassInfo || null)
      if (data.pagination) setPagination(data.pagination)
    } catch (error) {
      console.error("Error loading attendance data:", error)
    }
  }

  const loadMatchData = async () => {
    try {
      const params = new URLSearchParams({
        student: selectedMatchStudent,
        match: selectedMatch,
        page: currentMatchPage.toString(),
        limit: matchPageLimit.toString()
      })
      if (matchSearchTerm.trim()) params.set('search', matchSearchTerm.trim())
      if (matchDateRange?.from) {
        const year = matchDateRange.from.getFullYear();
        const month = (matchDateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = matchDateRange.from.getDate().toString().padStart(2, '0');
        params.append("startDate", `${year}-${month}-${day}`);
      }
      if (matchDateRange?.to) {
        const year = matchDateRange.to.getFullYear();
        const month = (matchDateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = matchDateRange.to.getDate().toString().padStart(2, '0');
        params.append("endDate", `${year}-${month}-${day}`);
      }
      const response = await fetch(`/api/match-attendance-history?${params}`)
      const data = await response.json()
      setMatchAttendanceData(data.chartData || [])
      setMatchStats(data.matchStats || [])
      setAvailableMatches(data.availableMatches || [])
      setSelectedMatchInfo(data.selectedMatchInfo || null)
      if (data.pagination) setMatchPagination(data.pagination)
    } catch (error) {
      console.error("Error loading match data:", error)
    }
  }


  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-300"
    if (percentage >= 75) return "text-amber-300"
    return "text-red-300"
  }

  const getPercentageBadge = (percentage: number) => {
    if (percentage >= 90) return "default"
    if (percentage >= 75) return "secondary"
    return "destructive"
  }

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '✅ Completado'
      case 'SCHEDULED':
        return '📅 Programado'
      case 'IN_PROGRESS':
        return '⏳ En curso'
      case 'CANCELLED':
        return '❌ Cancelado'
      default:
        return status
    }
  }

  const handleExportAttendanceExcel = async () => {
    try {
      // Validar que al menos un filtro esté seleccionado
      const hasDateFilter = dateRange?.from || dateRange?.to;
      const hasStudentFilter = selectedStudent && selectedStudent !== 'all';
      const hasClassFilter = selectedClass && selectedClass !== 'all';
      
      if (!hasDateFilter && !hasStudentFilter && !hasClassFilter) {
        toast({
          title: "⚠️ Filtro requerido",
          description: "Debe seleccionar al menos un filtro (fecha, estudiante o clase) para exportar las asistencias",
          variant: "destructive",
        });
        return;
      }
      
      setIsDownloading(true);
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        const year = dateRange.from.getFullYear();
        const month = (dateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = dateRange.from.getDate().toString().padStart(2, '0');
        params.set('startDate', `${year}-${month}-${day}`);
      }
      
      if (dateRange?.to) {
        const year = dateRange.to.getFullYear();
        const month = (dateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = dateRange.to.getDate().toString().padStart(2, '0');
        params.set('endDate', `${year}-${month}-${day}`);
      }
      
      if (selectedStudent && selectedStudent !== 'all') {
        params.set('student', selectedStudent);
      }
      
      if (selectedClass && selectedClass !== 'all') {
        params.set('class', selectedClass);
      }
      
      const response = await fetch(`/api/attendance/export-excel?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar asistencias');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'asistencias.xlsx';
      if (contentDisposition) {
        const filenameRegex = /filename="(.+)"/;
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
      console.error('Error downloading attendance Excel file:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error al descargar archivo Excel',
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const loadStudentAttendanceDetails = async (student: StudentStats) => {
    try {
      setIsLoadingDetails(true)
      const params = new URLSearchParams({
        student: student.id.toString(),
        class: selectedClass,
      })
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
      
      const response = await fetch(`/api/attendance-history/details?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar detalles')
      }
      const data = await response.json()
      setStudentAttendanceDetails(data.attendances || [])
    } catch (error) {
      console.error("Error loading student attendance details:", error)
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los detalles de asistencia",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleOpenStudentDetail = async (student: StudentStats) => {
    setSelectedStudentForDetail(student)
    setIsDetailModalOpen(true)
    await loadStudentAttendanceDetails(student)
  }

  const loadMatchAttendanceDetails = async (student: MatchStats) => {
    try {
      setIsLoadingMatchDetails(true)
      const params = new URLSearchParams({
        student: student.id.toString(),
        match: selectedMatch,
      })
      if (matchDateRange?.from) {
        const year = matchDateRange.from.getFullYear();
        const month = (matchDateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = matchDateRange.from.getDate().toString().padStart(2, '0');
        params.append("startDate", `${year}-${month}-${day}`);
      }
      if (matchDateRange?.to) {
        const year = matchDateRange.to.getFullYear();
        const month = (matchDateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = matchDateRange.to.getDate().toString().padStart(2, '0');
        params.append("endDate", `${year}-${month}-${day}`);
      }
      
      const response = await fetch(`/api/match-attendance-history/details?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar detalles')
      }
      const data = await response.json()
      setMatchAttendanceDetails(data.attendances || [])
    } catch (error) {
      console.error("Error loading match attendance details:", error)
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los detalles de asistencia de eventos",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMatchDetails(false)
    }
  }

  const handleOpenMatchStudentDetail = async (student: MatchStats) => {
    setSelectedMatchStudentForDetail(student)
    setIsMatchDetailModalOpen(true)
    await loadMatchAttendanceDetails(student)
  }

  const loadConsecutiveAbsences = async () => {
    try {
      setIsLoadingConsecutiveAbsences(true)
      const params = new URLSearchParams()
      if (selectedClass && selectedClass !== 'all') {
        params.set('class', selectedClass)
      }
      
      const response = await fetch(`/api/attendance-history/consecutive-absences?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar faltas consecutivas')
      }
      const data = await response.json()
      setStudentsWithConsecutiveAbsences(data.students || [])
    } catch (error) {
      console.error("Error loading consecutive absences:", error)
      setStudentsWithConsecutiveAbsences([])
    } finally {
      setIsLoadingConsecutiveAbsences(false)
    }
  }

  const loadMatchConsecutiveAbsences = async () => {
    try {
      setIsLoadingMatchConsecutiveAbsences(true)
      const params = new URLSearchParams()
      if (selectedMatch && selectedMatch !== 'all') {
        params.set('match', selectedMatch)
      }
      
      const response = await fetch(`/api/match-attendance-history/consecutive-absences?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar faltas consecutivas de eventos')
      }
      const data = await response.json()
      setMatchStudentsWithConsecutiveAbsences(data.students || [])
    } catch (error) {
      console.error("Error loading match consecutive absences:", error)
      setMatchStudentsWithConsecutiveAbsences([])
    } finally {
      setIsLoadingMatchConsecutiveAbsences(false)
    }
  }

  const handleExportEventsExcel = async () => {
    try {
      // Validar que al menos un filtro esté seleccionado
      const hasDateFilter = matchDateRange?.from || matchDateRange?.to;
      const hasStudentFilter = selectedMatchStudent && selectedMatchStudent !== 'all';
      const hasEventFilter = selectedMatch && selectedMatch !== 'all';
      
      if (!hasDateFilter && !hasStudentFilter && !hasEventFilter) {
        toast({
          title: "⚠️ Filtro requerido",
          description: "Debe seleccionar al menos un filtro (fecha, estudiante o evento) para exportar los eventos",
          variant: "destructive",
        });
        return;
      }
      
      setIsDownloadingEvents(true);
      const params = new URLSearchParams();
      
      if (matchDateRange?.from) {
        const year = matchDateRange.from.getFullYear();
        const month = (matchDateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = matchDateRange.from.getDate().toString().padStart(2, '0');
        params.set('startDate', `${year}-${month}-${day}`);
      }
      
      if (matchDateRange?.to) {
        const year = matchDateRange.to.getFullYear();
        const month = (matchDateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = matchDateRange.to.getDate().toString().padStart(2, '0');
        params.set('endDate', `${year}-${month}-${day}`);
      }
      
      if (selectedMatchStudent && selectedMatchStudent !== 'all') {
        params.set('student', selectedMatchStudent);
      }
      
      if (selectedMatch && selectedMatch !== 'all') {
        params.set('match', selectedMatch);
      }
      
      const response = await fetch(`/api/events/export-excel?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar eventos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'eventos.xlsx';
      if (contentDisposition) {
        const filenameRegex = /filename="(.+)"/;
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
      console.error('Error downloading events Excel file:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error al descargar archivo Excel',
        variant: "destructive",
      });
    } finally {
      setIsDownloadingEvents(false);
    }
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 border border-gray-600 mb-4">
          <TabsTrigger 
            value="classes" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4" />
            Clases Normales
          </TabsTrigger>
          <TabsTrigger 
            value="matches" 
            className="flex items-center gap-2 data-[state=active]:bg-yellow-600 data-[state=active]:text-white"
          >
            <Trophy className="h-4 w-4" />
            Eventos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          {/* Filtros para clases normales */}
          <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Rango de Fechas</h2>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder="Seleccionar rango de fechas"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Clase</h2>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-blue-600">
                        🎯 Todas las clases
                      </SelectItem>
                      {availableClasses.map((danceClass) => (
                        <SelectItem key={danceClass.id} value={danceClass.id.toString()} className="text-white hover:bg-blue-600">
                          {danceClass.sport === 'DANCE' ? '💃' : '🏐'} {danceClass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200">Estudiante</h2>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-blue-600">
                        👥 Todos los estudiantes
                      </SelectItem>
                      {studentStats.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()} className="text-white hover:bg-blue-600">
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Exportar</h2>
                  <Button
                    onClick={handleExportAttendanceExcel}
                    disabled={isDownloading || (!dateRange?.from && !dateRange?.to && selectedStudent === 'all' && selectedClass === 'all')}
                    variant="outline"
                    size="sm"
                    className="w-full border-green-600 text-green-400 hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={(!dateRange?.from && !dateRange?.to && selectedStudent === 'all' && selectedClass === 'all') ? "Seleccione al menos un filtro para exportar" : "Exportar asistencias filtradas"}
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-1" />
                        <span className="hidden sm:inline">Descargando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Exportar Excel</span>
                        <span className="sm:hidden">Excel</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>


      {/* Información de la clase seleccionada */}
      {selectedClassInfo && (
        <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gradient-to-r from-blue-800/90 via-purple-800/90 to-blue-700/90 border border-blue-500 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Sección principal - Icono y información */}
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <div className="rounded-2xl bg-blue-600/20 p-2 sm:p-3 backdrop-blur-sm border border-blue-400 flex-shrink-0">
                  {selectedClassInfo.sport === 'DANCE' ? (
                    <span className="text-2xl sm:text-4xl">💃</span>
                  ) : (
                    <span className="text-2xl sm:text-4xl">🏐</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-2 break-words">
                    {selectedClassInfo.name}
                  </h3>
                  
                  {/* Información en columnas para móvil */}
                  <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-3 text-blue-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm sm:text-base">👨‍🏫</span>
                      <span className="text-sm sm:text-base break-words">{selectedClassInfo.trainer.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm sm:text-base">🏃‍♀️</span>
                      <span className="text-sm sm:text-base">{selectedClassInfo.sport === 'DANCE' ? 'Baile' : 'Voleibol'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm sm:text-base">📅</span>
                      <span className="text-sm sm:text-base">{selectedClassInfo.sessions.length} sesiones en el período</span>
                    </div>
                  </div>
                  
                  {selectedClassInfo.description && (
                    <p className="text-blue-100 mt-2 text-xs sm:text-sm break-words">{selectedClassInfo.description}</p>
                  )}
                </div>
              </div>
              
              {/* Contador de sesiones */}
              <div className="flex justify-center sm:justify-end">
                <div className="bg-blue-600/30 rounded-xl p-2 sm:p-3 border border-blue-400">
                  <div className="text-lg sm:text-2xl font-bold text-white text-center">
                    {selectedClassInfo.sessions.length}
                  </div>
                  <div className="text-blue-200 text-xs sm:text-sm text-center">Sesiones</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Gráfico de barras */}
        <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-white">
              <Calendar className="w-6 h-6" />
              <span className="text-2xl font-bold">
                Asistencia por Día
                {selectedClassInfo && (
                  <span className="text-lg font-normal text-blue-300 ml-2">
                    - {selectedClassInfo.name}
                  </span>
                )}
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

        {/* Estudiantes con 3 faltas consecutivas */}
        <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-white">
              <XCircle className="w-6 h-6 text-red-400" />
              <span className="text-2xl font-bold">
                Estudiantes con 3+ Faltas Consecutivas
                {selectedClassInfo && (
                  <span className="text-lg font-normal text-blue-300 ml-2">
                    - {selectedClassInfo.name}
                  </span>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingConsecutiveAbsences ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-300">Cargando...</span>
              </div>
            ) : studentsWithConsecutiveAbsences.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">¡Excelente!</h3>
                <p className="text-sm text-gray-400 max-w-[250px]">
                  No hay estudiantes con 3 o más faltas consecutivas en el último mes
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {studentsWithConsecutiveAbsences.map((student) => (
                  <Card key={student.id} className="bg-red-900/20 border-red-600/40">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar className="w-10 h-10 ring-2 ring-red-500">
                            <AvatarImage src={student.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold">
                              {student.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{student.name}</div>
                            <div className="text-xs text-gray-400">
                              Cédula: {student.id}
                              {student.class && (
                                <span> • {student.class.sport === 'DANCE' ? '💃' : '🏐'} {student.class.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <Badge variant="destructive" className="text-xs mb-1">
                            {student.consecutiveAbsences} faltas
                          </Badge>
                          <div className="text-xs text-gray-400">
                            Última: {formatDateOnlyWithoutTimezone(student.lastAbsenceDate)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de estudiantes */}
      <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-white">
            <CheckCircle className="w-6 h-6" />
            <span className="text-2xl font-bold">
              Estadísticas por Estudiante
              {selectedClassInfo && (
                <span className="text-lg font-normal text-blue-300 ml-2">
                  - {selectedClassInfo.name}
                </span>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Barra de búsqueda encima del listado */}
          <div className="mb-4">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadAttendanceData(); } }}
                  placeholder="Buscar por nombre o identificación"
                  className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <Button onClick={() => { setCurrentPage(1); loadAttendanceData(); }} className="bg-blue-600 hover:bg-blue-700">
                <Search className="w-4 h-4 mr-2" /> Buscar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-teal-300 to-amber-300 rounded-full flex items-center justify-center border-2 border-teal-600">
                  <BarChart3 className="w-12 h-12 text-teal-800" />
                </div>
                <h3 className="text-2xl font-bold text-teal-800 mb-2">Sin datos disponibles</h3>
                <p className="text-slate-700">No hay estadísticas para el período seleccionado</p>
              </div>
            ) : (
              studentStats.map((student) => (
                <Card key={student.id} className="bg-gray-700/80 border border-gray-600 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 ring-4 ring-teal-600/60 shadow-lg">
                          <AvatarImage src={student.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                              <h4 className="text-base font-medium text-white">{student.name}</h4>
                          <p className="text-sm text-gray-300 mt-1">
                            Cédula: {student.id} • {student.totalClasses} clases totales
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                            <div className={`text-lg font-bold mb-2 ${getPercentageColor(student.percentage)}`}>
                          {student.percentage.toFixed(1)}%
                        </div>
                        <Badge
                          variant={getPercentageBadge(student.percentage) as any}
                          className="text-sm px-3 py-1"
                        >
                          {student.percentage >= 90 ? "Excelente" : student.percentage >= 75 ? "Regular" : "Necesita mejorar"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-emerald-900/30 rounded-xl border border-emerald-600/40">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-emerald-300" />
                          <span className="text-sm font-medium text-emerald-200">Presentes</span>
                        </div>
                            <div className="text-base font-semibold text-emerald-300">{student.present}</div>
                      </div>

                      <div className="text-center p-3 bg-amber-900/30 rounded-xl border border-amber-600/40">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <Clock className="w-5 h-5 text-amber-300" />
                          <span className="text-sm font-medium text-amber-200">Tarde</span>
                        </div>
                            <div className="text-base font-semibold text-amber-300">{student.late}</div>
                      </div>

                      <div className="text-center p-3 bg-red-900/30 rounded-xl border border-red-600/40">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <XCircle className="w-5 h-5 text-red-300" />
                          <span className="text-sm font-medium text-red-200">Ausentes</span>
                        </div>
                            <div className="text-base font-semibold text-red-300">{student.absent}</div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button
                        onClick={() => handleOpenStudentDetail(student)}
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-500 text-blue-400 hover:bg-blue-900/50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalle de Clases
                      </Button>
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
              itemName="estudiantes"
              limitOptions={[10, 25, 50, 100]}
            />
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {/* Filtros para eventos */}
          <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Rango de Fechas</h2>
                  <DateRangePicker
                    dateRange={matchDateRange}
                    onDateRangeChange={setMatchDateRange}
                    placeholder="Seleccionar rango de fechas"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Evento</h2>
                  <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-yellow-600">
                        🏆 Todos los eventos
                      </SelectItem>
                      {availableMatches.map((match) => {
                        const matchDate = new Date(match.matchDate);
                        const dateStr = matchDate.toLocaleDateString("es-ES", { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: '2-digit' 
                        });
                        return (
                          <SelectItem key={match.id} value={match.id.toString()} className="text-white hover:bg-yellow-600">
                            🏐 {match.danceClass.name} - {dateStr}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200">Estudiante</h2>
                  <Select value={selectedMatchStudent} onValueChange={setSelectedMatchStudent}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-yellow-600">
                        👥 Todos los estudiantes
                      </SelectItem>
                      {matchStats.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()} className="text-white hover:bg-yellow-600">
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Exportar</h2>
                  <Button
                    onClick={handleExportEventsExcel}
                    disabled={isDownloadingEvents || (!matchDateRange?.from && !matchDateRange?.to && selectedMatchStudent === 'all' && selectedMatch === 'all')}
                    variant="outline"
                    size="sm"
                    className="w-full border-green-600 text-green-400 hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={(!matchDateRange?.from && !matchDateRange?.to && selectedMatchStudent === 'all' && selectedMatch === 'all') ? "Seleccione al menos un filtro para exportar" : "Exportar eventos filtrados"}
                  >
                    {isDownloadingEvents ? (
                      <>
                        <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-1" />
                        <span className="hidden sm:inline">Descargando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Exportar Excel</span>
                        <span className="sm:hidden">Excel</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del evento específico seleccionado */}
          {selectedMatchInfo && (
            <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gradient-to-r from-yellow-800/90 via-orange-800/90 to-yellow-700/90 border border-yellow-500 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Sección principal - Icono y información */}
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="rounded-2xl bg-yellow-600/20 p-2 sm:p-3 backdrop-blur-sm border border-yellow-400 flex-shrink-0">
                      <span className="text-2xl sm:text-4xl">🏆</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-2 break-words">
                        🏐 {selectedMatchInfo.danceClass.name}
                      </h3>
                      
                      {/* Información en columnas para móvil */}
                      <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-3 text-yellow-200 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm sm:text-base">📅</span>
                          <span className="text-sm sm:text-base break-words">{formatDateLongWithoutTimezone(selectedMatchInfo.matchDate)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm sm:text-base">👨‍🏫</span>
                          <span className="text-sm sm:text-base break-words">{selectedMatchInfo.danceClass.trainer.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-yellow-200">
                        <span className="text-sm sm:text-base">📊</span>
                        <span className="text-sm sm:text-base">{selectedMatchInfo.status === 'COMPLETED' ? 'Completado' : selectedMatchInfo.status === 'SCHEDULED' ? 'Programado' : selectedMatchInfo.status}</span>
                      </div>
                      
                      {selectedMatchInfo.notes && (
                        <p className="text-yellow-100 mt-2 text-xs sm:text-sm break-words">{selectedMatchInfo.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Contador de asistencias */}
                  <div className="flex justify-center sm:justify-end">
                    <div className="bg-yellow-600/30 rounded-xl p-2 sm:p-3 border border-yellow-400">
                      <div className="text-lg sm:text-2xl font-bold text-white text-center">
                        {selectedMatchInfo.attendances.length}
                      </div>
                      <div className="text-yellow-200 text-xs sm:text-sm text-center">Asistencias</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {/* Gráfico de barras para eventos */}
            <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Calendar className="w-6 h-6" />
                  <span className="text-2xl font-bold">
                    Asistencia por Evento
                    {selectedMatchInfo && (
                      <span className="text-lg font-normal text-yellow-300 ml-2">
                        - {selectedMatchInfo.danceClass.name} ({formatDateOnlyWithoutTimezone(selectedMatchInfo.matchDate)})
                      </span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={matchAttendanceData}>
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

            {/* Estudiantes con 3 faltas consecutivas en eventos */}
            <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-white">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <span className="text-2xl font-bold">
                    Estudiantes con 3+ Faltas Consecutivas
                    {selectedMatchInfo && (
                      <span className="text-lg font-normal text-yellow-300 ml-2">
                        - {selectedMatchInfo.danceClass.name}
                      </span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMatchConsecutiveAbsences ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-300">Cargando...</span>
                  </div>
                ) : matchStudentsWithConsecutiveAbsences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">¡Excelente!</h3>
                    <p className="text-sm text-gray-400 max-w-[250px]">
                      No hay estudiantes con 3 o más faltas consecutivas en eventos en el último mes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {matchStudentsWithConsecutiveAbsences.map((student) => (
                      <Card key={student.id} className="bg-red-900/20 border-red-600/40">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <Avatar className="w-10 h-10 ring-2 ring-red-500">
                                <AvatarImage src={student.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold">
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{student.name}</div>
                                <div className="text-xs text-gray-400">
                                  Cédula: {student.id}
                                  {student.class && (
                                    <span> • {student.class.sport === 'DANCE' ? '💃' : '🏐'} {student.class.name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <Badge variant="destructive" className="text-xs mb-1">
                                {student.consecutiveAbsences} faltas
                              </Badge>
                              <div className="text-xs text-gray-400">
                                Última: {formatDateOnlyWithoutTimezone(student.lastAbsenceDate)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabla de estudiantes para eventos */}
          <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-white">
                <Trophy className="w-6 h-6" />
                <span className="text-2xl font-bold">
                  Estadísticas por Estudiante - Eventos
                  {selectedMatchInfo && (
                    <span className="text-lg font-normal text-yellow-300 ml-2">
                      - {selectedMatchInfo.danceClass.name} ({formatDateOnlyWithoutTimezone(selectedMatchInfo.matchDate)})
                    </span>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barra de búsqueda para eventos */}
              <div className="mb-4">
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={matchSearchTerm}
                      onChange={(e) => setMatchSearchTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentMatchPage(1); loadMatchData(); } }}
                      placeholder="Buscar por nombre o identificación"
                      className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <Button onClick={() => { setCurrentMatchPage(1); loadMatchData(); }} className="bg-yellow-600 hover:bg-yellow-700">
                    <Search className="w-4 h-4 mr-2" /> Buscar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchStats.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full flex items-center justify-center border-2 border-yellow-600">
                      <Trophy className="w-12 h-12 text-yellow-800" />
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-800 mb-2">Sin datos de eventos</h3>
                    <p className="text-slate-700">No hay estadísticas de eventos para el período seleccionado</p>
                  </div>
                ) : (
                  matchStats.map((student) => (
                    <Card key={student.id} className="bg-gray-700/80 border border-gray-600 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12 ring-4 ring-yellow-600/60 shadow-lg">
                              <AvatarImage src={student.avatar || "/placeholder.svg"} />
                              <AvatarFallback className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg">
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="text-base font-medium text-white">{student.name}</h4>
                              <p className="text-sm text-gray-300 mt-1">
                                Cédula: {student.id} • {student.totalMatches} eventos totales
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-lg font-bold mb-2 ${getPercentageColor(student.percentage)}`}>
                              {student.percentage.toFixed(1)}%
                            </div>
                            <Badge
                              variant={getPercentageBadge(student.percentage) as any}
                              className="text-sm px-3 py-1"
                            >
                              {student.percentage >= 90 ? "Excelente" : student.percentage >= 75 ? "Regular" : "Necesita mejorar"}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-emerald-900/30 rounded-xl border border-emerald-600/40">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <CheckCircle className="w-5 h-5 text-emerald-300" />
                              <span className="text-sm font-medium text-emerald-200">Presentes</span>
                            </div>
                            <div className="text-base font-semibold text-emerald-300">{student.present}</div>
                          </div>

                          <div className="text-center p-3 bg-amber-900/30 rounded-xl border border-amber-600/40">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <Clock className="w-5 h-5 text-amber-300" />
                              <span className="text-sm font-medium text-amber-200">Tarde</span>
                            </div>
                            <div className="text-base font-semibold text-amber-300">{student.late}</div>
                          </div>

                          <div className="text-center p-3 bg-red-900/30 rounded-xl border border-red-600/40">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <XCircle className="w-5 h-5 text-red-300" />
                              <span className="text-sm font-medium text-red-200">Ausentes</span>
                            </div>
                            <div className="text-base font-semibold text-red-300">{student.absent}</div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Button
                            onClick={() => handleOpenMatchStudentDetail(student)}
                            variant="outline"
                            size="sm"
                            className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-900/50"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalle de Eventos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Paginación para eventos */}
              {matchPagination.totalPages > 1 && (
                <AdvancedPagination
                  pagination={{
                    page: matchPagination.page,
                    limit: matchPagination.limit,
                    totalCount: matchPagination.total,
                    totalPages: matchPagination.totalPages,
                    hasNext: matchPagination.page < matchPagination.totalPages,
                    hasPrev: matchPagination.page > 1
                  }}
                  currentPage={currentMatchPage}
                  onPageChange={(page) => setCurrentMatchPage(page)}
                  onLimitChange={(newLimit) => { setMatchPageLimit(newLimit); setCurrentMatchPage(1); }}
                  itemName="estudiantes"
                  limitOptions={[10, 25, 50, 100]}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de detalles del estudiante */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-blue-500">
                <AvatarImage src={selectedStudentForDetail?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                  {selectedStudentForDetail?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selectedStudentForDetail?.name}</div>
                <div className="text-sm font-normal text-gray-400">
                  Cédula: {selectedStudentForDetail?.id} • {selectedStudentForDetail?.totalClasses} clases totales
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Detalle de asistencia por clase con fecha
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-300">Cargando detalles...</span>
            </div>
          ) : studentAttendanceDetails.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Sin registros de asistencia</h3>
              <p className="text-sm text-gray-400">
                No hay registros de asistencia para este estudiante en el período seleccionado
              </p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Clases Presentes */}
              {studentAttendanceDetails.some(att => att.status === 'PRESENT') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-emerald-400">
                      Presentes ({studentAttendanceDetails.filter(att => att.status === 'PRESENT').length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {studentAttendanceDetails
                      .filter(att => att.status === 'PRESENT')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((attendance) => (
                        <Card key={attendance.id} className="bg-emerald-900/20 border-emerald-600/40">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-emerald-300">
                                    {attendance.session.danceClass.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-300">
                                    {attendance.session.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-400">
                                  👨‍🏫 {attendance.session.danceClass.trainer.name}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-emerald-300">
                                  {formatDateLongWithoutTimezone(attendance.date)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateOnlyWithoutTimezone(attendance.date)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Clases Tarde */}
              {studentAttendanceDetails.some(att => att.status === 'LATE') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-amber-400">
                      Llegó Tarde ({studentAttendanceDetails.filter(att => att.status === 'LATE').length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {studentAttendanceDetails
                      .filter(att => att.status === 'LATE')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((attendance) => (
                        <Card key={attendance.id} className="bg-amber-900/20 border-amber-600/40">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-amber-300">
                                    {attendance.session.danceClass.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-300">
                                    {attendance.session.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-400">
                                  👨‍🏫 {attendance.session.danceClass.trainer.name}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-amber-300">
                                  {formatDateLongWithoutTimezone(attendance.date)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateOnlyWithoutTimezone(attendance.date)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Clases Ausentes */}
              {studentAttendanceDetails.some(att => att.status === 'ABSENT') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-red-400">
                      Ausentes ({studentAttendanceDetails.filter(att => att.status === 'ABSENT').length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {studentAttendanceDetails
                      .filter(att => att.status === 'ABSENT')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((attendance) => (
                        <Card key={attendance.id} className="bg-red-900/20 border-red-600/40">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-red-300">
                                    {attendance.session.danceClass.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-red-500 text-red-300">
                                    {attendance.session.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-400">
                                  👨‍🏫 {attendance.session.danceClass.trainer.name}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-red-300">
                                  {formatDateLongWithoutTimezone(attendance.date)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateOnlyWithoutTimezone(attendance.date)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de detalles del estudiante - Eventos */}
      <Dialog open={isMatchDetailModalOpen} onOpenChange={setIsMatchDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-yellow-500">
                <AvatarImage src={selectedMatchStudentForDetail?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold">
                  {selectedMatchStudentForDetail?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selectedMatchStudentForDetail?.name}</div>
                <div className="text-sm font-normal text-gray-400">
                  Cédula: {selectedMatchStudentForDetail?.id} • {selectedMatchStudentForDetail?.totalMatches} eventos totales
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Detalle de asistencia a eventos con fecha
            </DialogDescription>
          </DialogHeader>

          {isLoadingMatchDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-300">Cargando detalles...</span>
            </div>
          ) : matchAttendanceDetails.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Sin registros de eventos</h3>
              <p className="text-sm text-gray-400">
                No hay registros de asistencia a eventos para este estudiante en el período seleccionado
              </p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Eventos Presentes */}
              {matchAttendanceDetails.some(att => att.status === 'PRESENT') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-emerald-400">
                      Presentes ({matchAttendanceDetails.filter(att => att.status === 'PRESENT').length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {matchAttendanceDetails
                      .filter(att => att.status === 'PRESENT')
                      .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())
                      .map((attendance) => (
                        <Card key={attendance.id} className="bg-emerald-900/20 border-emerald-600/40">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-emerald-300">
                                    {attendance.match.danceClass.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-300">
                                    {attendance.match.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                                    {getMatchStatusBadge(attendance.match.status)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-400">
                                  👨‍🏫 {attendance.match.danceClass.trainer.name}
                                </div>
                                {attendance.match.notes && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    📝 {attendance.match.notes}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-emerald-300">
                                  {formatDateLongWithoutTimezone(attendance.match.matchDate)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateOnlyWithoutTimezone(attendance.match.matchDate)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Eventos Tarde */}
              {matchAttendanceDetails.some(att => att.status === 'LATE') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-amber-400">
                      Llegó Tarde ({matchAttendanceDetails.filter(att => att.status === 'LATE').length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {matchAttendanceDetails
                      .filter(att => att.status === 'LATE')
                      .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())
                      .map((attendance) => (
                        <Card key={attendance.id} className="bg-amber-900/20 border-amber-600/40">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-amber-300">
                                    {attendance.match.danceClass.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-300">
                                    {attendance.match.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                                    {getMatchStatusBadge(attendance.match.status)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-400">
                                  👨‍🏫 {attendance.match.danceClass.trainer.name}
                                </div>
                                {attendance.match.notes && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    📝 {attendance.match.notes}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-amber-300">
                                  {formatDateLongWithoutTimezone(attendance.match.matchDate)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateOnlyWithoutTimezone(attendance.match.matchDate)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Eventos Ausentes */}
              {matchAttendanceDetails.some(att => att.status === 'ABSENT') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-red-400">
                      Ausentes ({matchAttendanceDetails.filter(att => att.status === 'ABSENT').length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {matchAttendanceDetails
                      .filter(att => att.status === 'ABSENT')
                      .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())
                      .map((attendance) => (
                        <Card key={attendance.id} className="bg-red-900/20 border-red-600/40">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-red-300">
                                    {attendance.match.danceClass.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-red-500 text-red-300">
                                    {attendance.match.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                                    {getMatchStatusBadge(attendance.match.status)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-400">
                                  👨‍🏫 {attendance.match.danceClass.trainer.name}
                                </div>
                                {attendance.match.notes && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    📝 {attendance.match.notes}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-red-300">
                                  {formatDateLongWithoutTimezone(attendance.match.matchDate)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateOnlyWithoutTimezone(attendance.match.matchDate)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
