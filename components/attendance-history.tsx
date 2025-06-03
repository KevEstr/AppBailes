"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
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
  ]

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
      <Card className="border-0 bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 text-white shadow-2xl mb-8 rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <span className="text-3xl font-bold">Historial Gráfico</span>
              <p className="text-orange-200 mt-2 text-lg">Análisis visual de asistencias</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card className="border-0 shadow-2xl mb-8 rounded-3xl">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-lg font-bold text-slate-700">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="border-2 border-slate-300 focus:border-orange-500 rounded-2xl h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week" className="text-lg">
                    Esta semana
                  </SelectItem>
                  <SelectItem value="month" className="text-lg">
                    Este mes
                  </SelectItem>
                  <SelectItem value="quarter" className="text-lg">
                    Trimestre
                  </SelectItem>
                  <SelectItem value="year" className="text-lg">
                    Este año
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-lg font-bold text-slate-700">Estudiante</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="border-2 border-slate-300 focus:border-orange-500 rounded-2xl h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-lg">
                    Todos
                  </SelectItem>
                  {studentStats.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()} className="text-lg">
                      {student.name} (Cédula: {student.id})
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
        <Card className="border-0 shadow-2xl rounded-3xl">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center space-x-3 text-slate-800">
              <Calendar className="w-6 h-6" />
              <span className="text-2xl font-bold">Asistencia por Día</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
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
        <Card className="border-0 shadow-2xl rounded-3xl">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center space-x-3 text-slate-800">
              <TrendingUp className="w-6 h-6" />
              <span className="text-2xl font-bold">Distribución General</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "16px",
                    color: "white",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de estudiantes */}
      <Card className="border-0 shadow-2xl rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-3 text-slate-800">
            <CheckCircle className="w-6 h-6" />
            <span className="text-2xl font-bold">Estadísticas por Estudiante</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {studentStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Sin datos disponibles</h3>
                <p className="text-slate-600">No hay estadísticas para el período seleccionado</p>
              </div>
            ) : (
              studentStats.map((student) => (
                <Card key={student.id} className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <Avatar className="w-16 h-16 ring-4 ring-white shadow-lg">
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
                          <h4 className="text-xl font-bold text-slate-800">{student.name}</h4>
                          <p className="text-slate-600 mt-1">
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
                      <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700">Presentes</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-600">{student.present}</div>
                      </div>

                      <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <Clock className="w-5 h-5 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">Tarde</span>
                        </div>
                        <div className="text-3xl font-bold text-amber-600">{student.late}</div>
                      </div>

                      <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-medium text-red-700">Ausentes</span>
                        </div>
                        <div className="text-3xl font-bold text-red-600">{student.absent}</div>
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
