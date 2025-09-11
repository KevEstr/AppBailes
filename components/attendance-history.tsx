"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateLongWithoutTimezone, formatDateOnlyWithoutTimezone } from "@/lib/date-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { TrendingUp, Calendar, CheckCircle, Clock, XCircle, BarChart3, Search, Trophy, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AdvancedPagination } from "@/components/ui/advanced-pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

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

  useEffect(() => {
    if (activeTab === "classes") {
      loadAttendanceData()
    }
  }, [dateRange, selectedStudent, selectedClass, currentPage, pageLimit, activeTab])

  useEffect(() => {
    if (activeTab === "matches") {
      loadMatchData()
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

  // Datos para gráficos de clases normales
  const pieData = [
    { name: "Presentes", value: (attendanceData || []).reduce((sum, day) => sum + day.present, 0), color: "#10B981" },
    { name: "Tarde", value: (attendanceData || []).reduce((sum, day) => sum + day.late, 0), color: "#F59E0B" },
    { name: "Ausentes", value: (attendanceData || []).reduce((sum, day) => sum + day.absent, 0), color: "#EF4444" },
  ].filter(item => item.value > 0);

  // Datos para gráficos de partidos
  const matchPieData = [
    { name: "Presentes", value: (matchAttendanceData || []).reduce((sum, day) => sum + day.present, 0), color: "#10B981" },
    { name: "Tarde", value: (matchAttendanceData || []).reduce((sum, day) => sum + day.late, 0), color: "#F59E0B" },
    { name: "Ausentes", value: (matchAttendanceData || []).reduce((sum, day) => sum + day.absent, 0), color: "#EF4444" },
  ].filter(item => item.value > 0);

  const hasAttendanceData = pieData.length > 0;
  const hasMatchData = matchPieData.length > 0;

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
            Partidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          {/* Filtros para clases normales */}
          <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              </div>
            </CardContent>
          </Card>


      {/* Información de la clase seleccionada */}
      {selectedClassInfo && (
        <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gradient-to-r from-blue-800/90 via-purple-800/90 to-blue-700/90 border border-blue-500 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-2xl bg-blue-600/20 p-3 backdrop-blur-sm border border-blue-400">
                  {selectedClassInfo.sport === 'DANCE' ? (
                    <span className="text-4xl">💃</span>
                  ) : (
                    <span className="text-4xl">🏐</span>
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">{selectedClassInfo.name}</h3>
                  <div className="flex items-center space-x-3 text-blue-200">
                    <span className="flex items-center space-x-2">
                      <span>👨‍🏫</span>
                      <span>{selectedClassInfo.trainer.name}</span>
                    </span>
                    <span className="flex items-center space-x-2">
                      <span>🏃‍♀️</span>
                      <span>{selectedClassInfo.sport === 'DANCE' ? 'Baile' : 'Voleibol'}</span>
                    </span>
                    <span className="flex items-center space-x-2">
                      <span>📅</span>
                      <span>{selectedClassInfo.sessions.length} sesiones en el período</span>
                    </span>
                  </div>
                  {selectedClassInfo.description && (
                    <p className="text-blue-100 mt-2 text-sm">{selectedClassInfo.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="bg-blue-600/30 rounded-xl p-3 border border-blue-400">
                  <div className="text-2xl font-bold text-white">
                    {selectedClassInfo.sessions.length}
                  </div>
                  <div className="text-blue-200 text-sm">Sesiones</div>
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

        {/* Gráfico circular */}
        <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-white">
              <TrendingUp className="w-6 h-6" />
              <span className="text-2xl font-bold">
                Distribución General
                {selectedClassInfo && (
                  <span className="text-lg font-normal text-blue-300 ml-2">
                    - {selectedClassInfo.name}
                  </span>
                )}
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
                      <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
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
                    formatter={(value, name) => [`${value} estudiantes`, name]}
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
          {/* Filtros para partidos */}
          <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Rango de Fechas</h2>
                  <DateRangePicker
                    dateRange={matchDateRange}
                    onDateRangeChange={setMatchDateRange}
                    placeholder="Seleccionar rango de fechas"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-200 mb-1">Partido</h2>
                  <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-yellow-600">
                        🏆 Todos los partidos
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
              </div>
            </CardContent>
          </Card>

          {/* Información del partido específico seleccionado */}
          {selectedMatchInfo && (
            <Card className="border-0 shadow-2xl mb-4 rounded-xl bg-gradient-to-r from-yellow-800/90 via-orange-800/90 to-yellow-700/90 border border-yellow-500 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-2xl bg-yellow-600/20 p-3 backdrop-blur-sm border border-yellow-400">
                      <span className="text-4xl">🏆</span>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">
                        🏐 {selectedMatchInfo.danceClass.name}
                      </h3>
                      <div className="flex items-center space-x-3 text-yellow-200 mb-2">
                        <span className="flex items-center space-x-2">
                          <span>📅</span>
                          <span>{formatDateLongWithoutTimezone(selectedMatchInfo.matchDate)}</span>
                        </span>
                        <span className="flex items-center space-x-2">
                          <span>👨‍🏫</span>
                          <span>{selectedMatchInfo.danceClass.trainer.name}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-yellow-200">
                        <span className="flex items-center space-x-2">
                          <span>📊</span>
                          <span>{selectedMatchInfo.status === 'COMPLETED' ? 'Completado' : selectedMatchInfo.status === 'SCHEDULED' ? 'Programado' : selectedMatchInfo.status}</span>
                        </span>
                      </div>
                      {selectedMatchInfo.notes && (
                        <p className="text-yellow-100 mt-2 text-sm">{selectedMatchInfo.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-yellow-600/30 rounded-xl p-3 border border-yellow-400">
                      <div className="text-2xl font-bold text-white">
                        {selectedMatchInfo.attendances.length}
                      </div>
                      <div className="text-yellow-200 text-sm">Asistencias</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            {/* Gráfico de barras para partidos */}
            <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Calendar className="w-6 h-6" />
                  <span className="text-2xl font-bold">
                    Asistencia por Partido
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

            {/* Gráfico circular para partidos */}
            <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-white">
                  <TrendingUp className="w-6 h-6" />
                  <span className="text-2xl font-bold">
                    Distribución de Partidos
                    {selectedMatchInfo && (
                      <span className="text-lg font-normal text-yellow-300 ml-2">
                        - {selectedMatchInfo.danceClass.name} ({formatDateOnlyWithoutTimezone(selectedMatchInfo.matchDate)})
                      </span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hasMatchData ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                      <PieChart className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Sin datos de partidos</h3>
                    <p className="text-sm text-gray-400 max-w-[250px]">
                      No hay registros de asistencia para partidos en el período seleccionado
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={matchPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey="value"
                        labelLine={true}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                        paddingAngle={2}
                      >
                        {matchPieData.map((entry, index) => (
                          <Cell key={`match-cell-${entry.name}-${index}`} fill={entry.color} />
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
                        formatter={(value, name) => [`${value} estudiantes`, name]}
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

          {/* Tabla de estudiantes para partidos */}
          <Card className="border-0 shadow-2xl rounded-xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3 text-white">
                <Trophy className="w-6 h-6" />
                <span className="text-2xl font-bold">
                  Estadísticas por Estudiante - Partidos
                  {selectedMatchInfo && (
                    <span className="text-lg font-normal text-yellow-300 ml-2">
                      - {selectedMatchInfo.danceClass.name} ({formatDateOnlyWithoutTimezone(selectedMatchInfo.matchDate)})
                    </span>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barra de búsqueda para partidos */}
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
                    <h3 className="text-2xl font-bold text-yellow-800 mb-2">Sin datos de partidos</h3>
                    <p className="text-slate-700">No hay estadísticas de partidos para el período seleccionado</p>
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
                                Cédula: {student.id} • {student.totalMatches} partidos totales
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
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Paginación para partidos */}
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
    </div>
  )
}
