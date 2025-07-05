"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Users,
  Calendar,
  GraduationCap
} from 'lucide-react'
import { useParadiseApi } from '@/hooks/use-paradise-api'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectItem, SelectValue, SelectTrigger, SelectContent } from '@/components/ui/select'

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

export default function ClassAttendanceTikTok() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [currentSession, setCurrentSession] = useState<ClassSession | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [isAttendanceMode, setIsAttendanceMode] = useState(false)

  // ⚡ OPTIMIZACIÓN: useParadiseApi para clases
  const { 
    data: classesData, 
    loading: classesLoading,
    error: classesError 
  } = useParadiseApi<{success: boolean, classes: DanceClass[]}>('/classes?active=true')

  // ⚡ EFECTO OPTIMIZADO: Solo cuando hay datos
  useEffect(() => {
    if (classesData?.success) {
      setClasses(classesData.classes)
      setLoading(false)
    }
  }, [classesData])

  useEffect(() => {
    if (classesError) {
      console.error("Error loading classes:", classesError)
      setLoading(false)
    }
  }, [classesError])

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
    console.log("request:", {
      studentId,
      status,
      sessionId: currentSession?.id,
      timestamp: new Date()
    })
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

  const selectedClassData = useMemo(() => 
    classes.find(c => c.id === selectedClass), 
    [classes, selectedClass]
  )
  
  const handleStartAttendance = () => {
    setIsAttendanceMode(true)
    toast({
      title: "✅ Iniciando asistencia",
      description: "Comenzando a tomar asistencia para " + classes.find(c => c.id === selectedClass)?.name,
    })
  }

  const handleFinishAttendance = () => {
    setSelectedClass(null)
    setCurrentStudentIndex(0)
    setIsAttendanceMode(false)
    toast({
      title: "✅ Asistencia completada",
      description: "Has terminado de tomar asistencia",
    })
  }

  const handleAttendanceAndNext = async (studentId: number, status: string) => {
    await markAttendance(studentId, status)
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(prev => prev + 1)
    } else {
      handleFinishAttendance()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500'
      case 'absent': return 'bg-red-500'
      case 'late': return 'bg-yellow-500'
      case 'change_request': return 'bg-blue-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-white" />
      case 'absent': return <XCircle className="h-4 w-4 text-white" />
      case 'late': return <Clock className="h-4 w-4 text-white" />
      case 'change_request': return <AlertTriangle className="h-4 w-4 text-white" />
      default: return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Presente'
      case 'absent': return 'Ausente'
      case 'late': return 'Tardanza'
      case 'change_request': return 'Cambio'
      default: return 'Sin marcar'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Cargando clases...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStudent = students[currentStudentIndex]

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header - Solo visible cuando no estamos tomando asistencia */}
      {!isAttendanceMode && (
        <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 px-4 py-4">
          <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-white mb-4 text-center">
              Toma de Asistencia
            </h1>
            <Label className="text-lg font-semibold text-white mb-2 block">
              Seleccionar Clase
            </Label>
            <Select 
              value={selectedClass?.toString() || ""} 
              onValueChange={(value) => {
                setSelectedClass(parseInt(value))
                setCurrentStudentIndex(0)
                setIsAttendanceMode(false)
              }}
            >
              <SelectTrigger className="w-full h-12 text-base rounded-xl border border-gray-600 bg-gray-800 text-white focus:border-blue-500">
                <SelectValue placeholder="Selecciona una clase" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {classes.map((danceClass) => (
                  <SelectItem 
                    key={danceClass.id} 
                    value={danceClass.id.toString()} 
                    className="text-white hover:bg-blue-600/20"
                  >
                    <div className="flex items-center space-x-3 py-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {danceClass.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{danceClass.name}</div>
                        <div className="text-xs text-gray-400">
                          {danceClass.trainer.name}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1">
        {!selectedClass ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Selecciona una Clase</h3>
                <p className="text-gray-400 text-sm">Elige la clase para tomar asistencia</p>
              </CardContent>
            </Card>
          </div>
        ) : !currentSession ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">No hay clase hoy</h3>
                <p className="text-gray-400 text-sm">No hay sesión programada para hoy</p>
              </CardContent>
            </Card>
          </div>
        ) : students.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Sin estudiantes</h3>
                <p className="text-gray-400 text-sm">No hay estudiantes inscritos</p>
              </CardContent>
            </Card>
          </div>
        ) : !isAttendanceMode ? (
          // Vista de confirmación antes de comenzar
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 max-w-lg w-full">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {classes.find(c => c.id === selectedClass)?.name}
                  </h2>
                  <p className="text-gray-400">
                    Instructor: {classes.find(c => c.id === selectedClass)?.trainer.name}
                  </p>
                  <p className="text-gray-400 mt-1">
                    {students.length} estudiantes
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-white">
                    ¿Comenzar a tomar asistencia?
                  </p>
                  <Button
                    onClick={handleStartAttendance}
                    className="w-full h-14 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
                  >
                    Comenzar Asistencia
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : currentStudent ? (
          // Vista TikTok del Estudiante - A pantalla completa
          <div className="fixed inset-0 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col">
            {/* Barra de Progreso */}
            <div className="absolute top-0 left-0 right-0 flex space-x-1 p-2">
              {students.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 flex-1 rounded-full ${
                    idx < currentStudentIndex ? 'bg-blue-500' : 
                    idx === currentStudentIndex ? 'bg-blue-500/50' : 
                    'bg-gray-700'
                  }`}
                ></div>
              ))}
            </div>

            {/* Contenido del Estudiante */}
            <div className="flex-1 flex flex-col justify-center items-center p-6">
              {/* Avatar y Nombre */}
              <div className="text-center mb-12">
                <Avatar className="w-48 h-48 mx-auto ring-8 ring-blue-500/30">
                  <AvatarImage src={currentStudent.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-5xl font-bold text-white">
                    {currentStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-6 text-3xl font-bold text-white">{currentStudent.name}</h2>
                {currentStudent.hasDebt && (
                  <Badge className="mt-3 bg-red-500/20 text-red-400 border-red-500 text-lg px-4 py-2">
                    Tiene deuda pendiente
                  </Badge>
                )}
              </div>

              {/* Estado Actual */}
              {currentStudent.status && (
                <div className="mb-12">
                  <Badge 
                    className={`${getStatusColor(currentStudent.status)} text-white px-6 py-3 text-xl`}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(currentStudent.status)}
                      <span>{getStatusText(currentStudent.status)}</span>
                    </div>
                  </Badge>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'present')}
                  className={`h-20 rounded-2xl text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === 'present' 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                  }`}
                >
                  <CheckCircle className="h-8 w-8 mr-3" />
                  Presente
                </Button>
                
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'absent')}
                  className={`h-20 rounded-2xl text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === 'absent' 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                  }`}
                >
                  <XCircle className="h-8 w-8 mr-3" />
                  Ausente
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'late')}
                  className={`h-20 rounded-2xl text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === 'late' 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                      : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                  }`}
                >
                  <Clock className="h-8 w-8 mr-3" />
                  Tarde
                </Button>
                
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'change_request')}
                  className={`h-20 rounded-2xl text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === 'change_request' 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                  }`}
                >
                  <AlertTriangle className="h-8 w-8 mr-3" />
                  Cambio
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
} 