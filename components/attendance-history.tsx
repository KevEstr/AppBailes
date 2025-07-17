"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { TrendingUp, Calendar, CheckCircle, Clock, XCircle, BarChart3 } from "lucide-react"

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

export function AttendanceHistory() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedStudent, setSelectedStudent] = useState<string>("all")
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [studentStats, setStudentStats] = useState<StudentStats[]>([])

  useEffect(() => {
    loadAttendanceData()
  }, [selectedPeriod, selectedStudent])

  const loadAttendanceData = async () => {
    try {
      const response = await fetch(`/api/attendance-history?period=${selectedPeriod}&student=${selectedStudent}`)
      const data = await response.json()
      setAttendanceData(data.chartData)
      setStudentStats(data.studentStats)
    } catch (error) {
      console.error("Error loading attendance data:", error)
    }
  }

  const pieData = [
    { name: "Presentes", value: attendanceData.reduce((sum, day) => sum + day.present, 0), color: "#10B981" },
    { name: "Tarde", value: attendanceData.reduce((sum, day) => sum + day.late, 0), color: "#F59E0B" },
    { name: "Ausentes", value: attendanceData.reduce((sum, day) => sum + day.absent, 0), color: "#EF4444" },
  ].filter(item => item.value > 0);

  const hasAttendanceData = pieData.length > 0;

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-600"
    if (percentage >= 75) return "text-amber-600"
    return "text-red-600"
  }

  const getPercentageBadge = (percentage: number) => {
    if (percentage >= 90) return "default"
    if (percentage >= 75) return "secondary"
    return "destructive"
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Análisis Paradise</span>
              <p className="text-blue-300 mt-2 text-lg">Estadísticas de asistencia de bailarines</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card className="border-0 shadow-2xl mb-8 rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-bold text-gray-200 mb-1">Período</h2>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="week" className="text-lg text-white hover:bg-blue-600">
                    📅 Última semana
                  </SelectItem>
                  <SelectItem value="month" className="text-lg text-white hover:bg-blue-600">
                    📅 Último mes
                  </SelectItem>
                  <SelectItem value="quarter" className="text-lg text-white hover:bg-blue-600">
                    📅 Último trimestre
                  </SelectItem>
                  <SelectItem value="year" className="text-lg text-white hover:bg-blue-600">
                    📅 Último año
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-200">Estudiante</h2>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all" className="text-lg text-white hover:bg-blue-600">
                    👥 Todos los estudiantes
                  </SelectItem>
                  {studentStats.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()} className="text-lg text-white hover:bg-blue-600">
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de barras */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center space-x-3 text-white">
              <Calendar className="w-6 h-6" />
              <span className="text-2xl font-bold">Asistencia por Día</span>
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
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center space-x-3 text-white">
              <TrendingUp className="w-6 h-6" />
              <span className="text-2xl font-bold">Distribución General</span>
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
      <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-3 text-white">
            <CheckCircle className="w-6 h-6" />
            <span className="text-2xl font-bold">Estadísticas por Estudiante</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <Avatar className="w-16 h-16 ring-4 ring-teal-600/60 shadow-lg">
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
                          <h4 className="text-xl font-bold text-teal-800">{student.name}</h4>
                          <p className="text-slate-700 mt-1">
                            Cédula: {student.id} • {student.totalClasses} clases totales
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-4xl font-bold mb-2 ${getPercentageColor(student.percentage)}`}>
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

                    <div className="mt-6 grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-emerald-100 rounded-xl border-2 border-emerald-400">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-emerald-700" />
                          <span className="text-sm font-medium text-emerald-700">Presentes</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-700">{student.present}</div>
                      </div>

                      <div className="text-center p-4 bg-amber-100 rounded-xl border-2 border-amber-400">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <Clock className="w-5 h-5 text-amber-700" />
                          <span className="text-sm font-medium text-amber-700">Tarde</span>
                        </div>
                        <div className="text-3xl font-bold text-amber-700">{student.late}</div>
                      </div>

                      <div className="text-center p-4 bg-red-100 rounded-xl border-2 border-red-400">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <XCircle className="w-5 h-5 text-red-700" />
                          <span className="text-sm font-medium text-red-700">Ausentes</span>
                        </div>
                        <div className="text-3xl font-bold text-red-700">{student.absent}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
