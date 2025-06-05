"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  GraduationCap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"

interface Student {
  id: number
  name: string
  avatar: string
  hasDebt: boolean
  status?: "present" | "late" | "absent" | "change_request"
}

interface DanceClass {
  id: number
  name: string
  description?: string
  trainer: {
    id: number
    name: string
  }
  enrollments: {
    student: {
      id: number
      name: string
      avatar: string
      hasDebt: boolean
    }
  }[]
}

interface ClassSession {
  id: number
  date: string
  startTime: string
  endTime: string
  status: string
  danceClass: DanceClass
  attendances: {
    id: number
    status: string
    student: {
      id: number
      name: string
      avatar: string
    }
  }[]
}

export function AttendanceSystem() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [currentSession, setCurrentSession] = useState<ClassSession | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const loadClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes?active=true")
      const data = await response.json()
      if (data.success) {
        setClasses(data.classes)
      }
    } catch (error) {
      console.error("Error loading classes:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const loadTodaySession = useCallback(async () => {
    if (!selectedClass) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/class-sessions?classId=${selectedClass}&date=${today}`)
      const data = await response.json()
      
      if (data.success && data.sessions.length > 0) {
        const session = data.sessions[0]
        setCurrentSession(session)
        
        const enrolledStudents = session.danceClass.enrollments.map((enrollment: any) => ({
          id: enrollment.student.id,
          name: enrollment.student.name,
          avatar: enrollment.student.avatar || "/placeholder.svg",
          hasDebt: enrollment.student.hasDebt,
          status: session.attendances.find((att: any) => att.student.id === enrollment.student.id)?.status?.toLowerCase() || undefined
        }))
        
        setStudents(enrolledStudents)
      }
    } catch (error) {
      console.error("Error loading session:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo cargar la sesión",
        variant: "destructive",
      })
    }
  }, [selectedClass, toast])

  useEffect(() => {
    if (selectedClass) {
      loadTodaySession()
    }
  }, [selectedClass, loadTodaySession])

  const markAttendance = useCallback(async (studentId: number, status: string) => {
    if (!currentSession) {
      toast({
        title: "❌ Error",
        description: "No hay sesión activa",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentId, 
          status, 
          sessionId: currentSession.id,
          timestamp: new Date() 
        }),
      })

      const result = await response.json()

      if (result.success) {
        setStudents(prev => prev.map(student => 
          student.id === studentId 
            ? { ...student, status: status as any } 
            : student
        ))

        const statusMessages = {
          present: "✅ Presente",
          late: "⏰ Llegada Tarde", 
          absent: "❌ Ausente",
          change_request: "🔄 Cambio de Grupo",
        }

        const studentName = students.find((s) => s.id === studentId)?.name
        toast({
          title: statusMessages[status as keyof typeof statusMessages],
          description: studentName,
        })
      } else {
        toast({
          title: "❌ Error",
          description: result.error || "No se pudo registrar",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo registrar",
        variant: "destructive",
      })
    }
  }, [currentSession, students, toast])

  const attendanceStats = useMemo(() => {
    const present = students.filter(s => s.status === "present").length
    const late = students.filter(s => s.status === "late").length
    const absent = students.filter(s => s.status === "absent").length
    const pending = students.filter(s => !s.status).length
    const total = students.length
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0

    return { present, late, absent, pending, total, percentage }
  }, [students])

  const selectedClassData = useMemo(() => 
    classes.find(c => c.id === selectedClass), 
    [classes, selectedClass]
  )

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Cargando clases...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const attendancePercentage = attendanceStats.percentage

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Asistencia Paradise</span>
              <p className="text-blue-300 mt-2 text-lg">Control visual de asistencias en tiempo real</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Selector de clase */}
      <Card className="border-0 shadow-2xl mb-8 rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-center space-x-6">
            <div className="flex-1">
              <Label className="text-xl font-bold text-white mb-3 block">
                Seleccionar Clase de Baile
              </Label>
              <Select 
                value={selectedClass?.toString() || ""} 
                onValueChange={(value) => setSelectedClass(parseInt(value))}
              >
                <SelectTrigger className="h-14 text-lg rounded-xl border border-gray-600 bg-gray-700 text-white focus:border-blue-500">
                  <SelectValue placeholder="Selecciona una clase" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {classes.map((danceClass) => (
                    <SelectItem key={danceClass.id} value={danceClass.id.toString()} className="h-16 py-4 text-white hover:bg-blue-600">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center border border-blue-500">
                          <span className="text-white text-lg font-bold">{danceClass.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-bold text-lg">{danceClass.name}</div>
                          <div className="text-sm text-gray-400">
                            {danceClass.trainer.name} • {danceClass.enrollments.length} estudiantes
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {currentSession && (
              <div className="text-center">
                <Badge variant="outline" className="bg-purple-950/50 text-purple-400 border-purple-500 text-lg px-4 py-2">
                  {students.length} estudiantes
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedClass ? (
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Selecciona una Clase</h3>
            <p className="text-gray-300">Elige la clase de baile para tomar asistencia</p>
          </CardContent>
        </Card>
      ) : !currentSession ? (
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center shadow-xl">
              <Calendar className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">No hay clase hoy</h3>
            <p className="text-gray-300">No hay sesión programada para la fecha actual</p>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-xl">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Sin estudiantes inscritos</h3>
            <p className="text-gray-300">No hay estudiantes inscritos en esta clase</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">{attendanceStats.present}</div>
                <div className="text-gray-300 font-medium">Presentes</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">{attendanceStats.absent}</div>
                <div className="text-gray-300 font-medium">Ausentes</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{attendancePercentage}%</div>
                <div className="text-gray-300 font-medium">Asistencia</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de estudiantes */}
          <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-600">
              <CardTitle className="text-2xl font-bold text-white">
                👥 Lista de Asistencia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <Card
                    key={student.id}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 border ${
                      student.status === "present" 
                        ? 'border-green-500 bg-green-950/50' 
                        : student.status === "absent" 
                        ? 'border-red-500 bg-red-950/50'
                        : 'border-gray-600 bg-gray-700/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{student.name}</h4>
                          <p className="text-sm text-gray-400">ID: {student.id}</p>
                        </div>
                        <div className="text-2xl">
                          {student.status === "present" && <CheckCircle className="text-green-400 w-8 h-8" />}
                          {student.status === "absent" && <XCircle className="text-red-400 w-8 h-8" />}
                          {!student.status && <Clock className="text-gray-400 w-8 h-8" />}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => markAttendance(student.id, "present")}
                          className={`h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            student.status === "present" 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-600 hover:bg-green-600 text-gray-300 hover:text-white'
                          }`}
                        >
                          ✅ Presente
                        </Button>
                        
                        <Button
                          onClick={() => markAttendance(student.id, "absent")}
                          className={`h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            student.status === "absent" 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-gray-600 hover:bg-red-600 text-gray-300 hover:text-white'
                          }`}
                        >
                          ❌ Ausente
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span className="text-white">Total: {students.length} estudiantes</span>
                  <div className="flex space-x-4">
                    <span className="text-green-400">✅ {attendanceStats.present}</span>
                    <span className="text-red-400">❌ {attendanceStats.absent}</span>
                    <span className="text-gray-400">⏸️ {attendanceStats.pending}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 