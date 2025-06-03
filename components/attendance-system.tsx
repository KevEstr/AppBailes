"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookOpen,
  GraduationCap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: number // Cédula del estudiante
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
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isTrainerMode, setIsTrainerMode] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await fetch("/api/classes?active=true")
        const data = await response.json()
        if (data.success) {
          setClasses(data.classes)
        }
      } catch (error) {
        console.error("Error loading classes:", error)
      }
    }
    
    loadClasses()
    setLoading(false)

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadTodaySession()
    }
  }, [selectedClass])

  const loadTodaySession = async () => {
    if (!selectedClass) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/class-sessions?classId=${selectedClass}&date=${today}`)
      const data = await response.json()
      
      if (data.success && data.sessions.length > 0) {
        const session = data.sessions[0]
        setCurrentSession(session)
        
        // Cargar estudiantes inscritos con su estado de asistencia
        const enrolledStudents = session.danceClass.enrollments.map((enrollment: any) => ({
          id: enrollment.student.id,
          name: enrollment.student.name,
          avatar: enrollment.student.avatar || "/placeholder.svg",
          hasDebt: enrollment.student.hasDebt,
          status: session.attendances.find((att: any) => att.student.id === enrollment.student.id)?.status?.toLowerCase() || undefined
        }))
        
        setStudents(enrolledStudents)
        setCurrentStudentIndex(0)
      } else {
        // No hay sesión para hoy, crear una automáticamente si es día de clase
        await createTodaySession()
      }
    } catch (error) {
      console.error("Error loading session:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo cargar la sesión",
        variant: "destructive",
      })
    }
  }

  const createTodaySession = async () => {
    if (!selectedClass) return

    try {
      const selectedClassData = classes.find(c => c.id === selectedClass)
      if (!selectedClassData) return

      const today = new Date()
      const dayOfWeek = today.getDay()
      
      // Buscar si hay horario para hoy
      const response = await fetch(`/api/classes/${selectedClass}`)
      const classData = await response.json()
      
      if (classData.success && classData.class.schedules) {
        const todaySchedule = classData.class.schedules.find((schedule: any) => schedule.dayOfWeek === dayOfWeek)
        
        if (todaySchedule) {
          // Crear sesión para hoy
          const sessionResponse = await fetch("/api/class-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              classId: selectedClass,
              date: today.toISOString().split('T')[0],
              startTime: todaySchedule.startTime,
              endTime: todaySchedule.endTime
            })
          })

          if (sessionResponse.ok) {
            await loadTodaySession() // Recargar
          }
        } else {
          toast({
            title: "ℹ️ Sin clase hoy",
            description: "No hay clase programada para hoy",
          })
        }
      }
    } catch (error) {
      console.error("Error creating session:", error)
    }
  }

  const markAttendance = async (studentId: number, status: string) => {
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
        setStudents((prev) =>
          prev.map((student) => 
            student.id === studentId 
              ? { ...student, status: status as any } 
              : student
          ),
        )

        const statusMessages = {
          present: "✅ Presente",
          late: "⏰ Llegada Tarde",
          absent: "❌ Ausente",
          change_request: "🔄 Cambio de Grupo",
        }

        toast({
          title: statusMessages[status as keyof typeof statusMessages],
          description: `${students.find((s) => s.id === studentId)?.name}`,
        })

        // Avanzar al siguiente estudiante automáticamente
        if (currentStudentIndex < students.length - 1) {
          setCurrentStudentIndex(currentStudentIndex + 1)
        }
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
  }

  const nextStudent = () => {
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1)
    }
  }

  const prevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1)
    }
  }

  const currentStudent = students[currentStudentIndex]

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-xl rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando sistema de asistencias...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-black via-gray-900 to-black text-white shadow-2xl mb-8 rounded-3xl border border-cyan-400/30">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-cyan-500/20 p-3 backdrop-blur-sm border border-cyan-400/50">
                <Zap className="h-8 w-8 text-cyan-400" />
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-yellow-400 bg-clip-text text-transparent">Asistencia Paradise</span>
                <p className="text-cyan-200 mt-2">Control rápido y visual de estudiantes</p>
              </div>
            </div>
            <div className="text-right text-lg">
              <div className="text-cyan-400 font-mono text-2xl">{currentTime.toLocaleTimeString()}</div>
              <div className="text-yellow-400">{currentTime.toLocaleDateString()}</div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Selector de Clase */}
      <Card className="border-0 shadow-2xl mb-8 rounded-2xl bg-gray-900/50 border border-cyan-400/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-cyan-400" />
            <span className="text-cyan-100">Seleccionar Clase de Baile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedClass?.toString() || ""} 
            onValueChange={(value) => setSelectedClass(parseInt(value))}
          >
            <SelectTrigger className="h-14 text-lg rounded-xl border-2 border-cyan-400/30 bg-black/50 text-cyan-100 focus:border-cyan-400">
              <SelectValue placeholder="Selecciona una clase de Paradise..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-cyan-400/30">
              {classes.map((danceClass) => (
                <SelectItem key={danceClass.id} value={danceClass.id.toString()} className="h-16 py-4 text-cyan-100 hover:bg-cyan-500/20">
                  <div className="flex flex-col">
                    <span className="font-semibold text-cyan-400">{danceClass.name}</span>
                    <span className="text-sm text-gray-400">
                      Instructor: {danceClass.trainer.name} • {danceClass.enrollments.length} bailarines inscritos
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentSession && (
            <div className="mt-4 p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">Clase de Hoy en Paradise</span>
                </div>
                <Badge variant="outline" className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">
                  {new Date(currentSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(currentSession.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedClass ? (
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-900/50 border border-cyan-400/20">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-cyan-500 to-yellow-400 rounded-full flex items-center justify-center shadow-xl shadow-cyan-400/50">
              <GraduationCap className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-2xl font-bold text-cyan-400">Selecciona una Clase Paradise</h3>
            <p className="text-gray-300">Elige la clase de baile para tomar asistencia</p>
          </CardContent>
        </Card>
      ) : !currentSession ? (
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-900/50 border border-cyan-400/20">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-yellow-400/50">
              <Calendar className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-2xl font-bold text-yellow-400">No hay clase hoy</h3>
            <p className="text-gray-300">No hay sesión de baile programada para la fecha actual</p>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-900/50 border border-cyan-400/20">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-xl shadow-cyan-400/50">
              <Users className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-2xl font-bold text-cyan-400">Sin bailarines inscritos</h3>
            <p className="text-gray-300">No hay estudiantes inscritos en esta clase de Paradise</p>
          </CardContent>
        </Card>
      ) : (
        /* Modo Visual - Un estudiante a la vez */
        <div className="space-y-6">
          {currentStudent && (
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-gray-900/50 border border-cyan-400/30">
              <CardContent className="p-0">
                {/* Imagen grande del estudiante */}
                <div className="relative h-96 bg-gradient-to-br from-cyan-500/20 to-yellow-400/20 flex items-center justify-center">
                  <Avatar className="w-64 h-64 ring-8 ring-cyan-400/50 shadow-2xl shadow-cyan-400/30">
                    <AvatarImage src={currentStudent.avatar || "/placeholder.svg"} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-yellow-400 text-black text-6xl font-bold">
                      {currentStudent.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Indicador de estado actual */}
                  {currentStudent.status && (
                    <div className="absolute top-6 right-6">
                      <Badge
                        variant="secondary"
                        className={`text-lg px-4 py-2 font-bold rounded-full ${
                          currentStudent.status === "present"
                            ? "bg-green-500/80 text-white border-green-400 shadow-green-400/50"
                            : currentStudent.status === "late"
                            ? "bg-yellow-500/80 text-black border-yellow-400 shadow-yellow-400/50"
                            : currentStudent.status === "absent"
                            ? "bg-red-500/80 text-white border-red-400 shadow-red-400/50"
                            : "bg-cyan-500/80 text-black border-cyan-400 shadow-cyan-400/50"
                        } shadow-lg`}
                      >
                        {currentStudent.status === "present" && "✅ Presente"}
                        {currentStudent.status === "late" && "⏰ Tarde"}
                        {currentStudent.status === "absent" && "❌ Ausente"}
                        {currentStudent.status === "change_request" && "🔄 Cambio"}
                      </Badge>
                    </div>
                  )}

                  {/* Indicador de deuda */}
                  {currentStudent.hasDebt && (
                    <div className="absolute top-6 left-6">
                      <Badge variant="destructive" className="text-lg px-4 py-2 font-bold rounded-full bg-red-500/80 shadow-lg shadow-red-400/50">
                        💰 Mensualidad Pendiente
                      </Badge>
                    </div>
                  )}

                  {/* Navegación */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-full w-16 h-16 shadow-lg border border-cyan-400/30 text-cyan-400"
                    onClick={prevStudent}
                    disabled={currentStudentIndex === 0}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-full w-16 h-16 shadow-lg border border-cyan-400/30 text-cyan-400"
                    onClick={nextStudent}
                    disabled={currentStudentIndex === students.length - 1}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </div>

                {/* Información del estudiante */}
                <div className="p-8 bg-black/80">
                  <div className="text-center mb-6">
                    <h2 className="text-4xl font-bold text-cyan-400 mb-2">{currentStudent.name}</h2>
                    <div className="flex items-center justify-center space-x-4 text-gray-300">
                      <span className="text-lg">Cédula: {currentStudent.id}</span>
                      <span className="text-lg">
                        Bailarín {currentStudentIndex + 1} de {students.length}
                      </span>
                    </div>
                  </div>

                  {/* Botones de asistencia */}
                  <div className="grid grid-cols-2 gap-6">
                    <Button
                      onClick={() => markAttendance(currentStudent.id, "present")}
                      className="h-20 text-xl font-bold bg-green-500 hover:bg-green-600 rounded-2xl shadow-lg shadow-green-400/50"
                      disabled={currentStudent.status === "present"}
                    >
                      <CheckCircle className="h-8 w-8 mr-3" />
                      Presente
                    </Button>

                    <Button
                      onClick={() => markAttendance(currentStudent.id, "late")}
                      className="h-20 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 rounded-2xl shadow-lg shadow-yellow-400/50 text-black"
                      disabled={currentStudent.status === "late"}
                    >
                      <Clock className="h-8 w-8 mr-3" />
                      Tarde
                    </Button>

                    <Button
                      onClick={() => markAttendance(currentStudent.id, "absent")}
                      variant="destructive"
                      className="h-20 text-xl font-bold rounded-2xl shadow-lg shadow-red-400/50"
                      disabled={currentStudent.status === "absent"}
                    >
                      <XCircle className="h-8 w-8 mr-3" />
                      Ausente
                    </Button>

                    <Button
                      onClick={() => markAttendance(currentStudent.id, "change_request")}
                      className="h-20 text-xl font-bold bg-cyan-500 hover:bg-cyan-600 rounded-2xl shadow-lg shadow-cyan-400/50 text-black"
                      disabled={currentStudent.status === "change_request"}
                    >
                      <RotateCcw className="h-8 w-8 mr-3" />
                      Cambio
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
