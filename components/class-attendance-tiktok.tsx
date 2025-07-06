"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Check,
  X,
  Clock as ClockIcon, 
  AlertTriangle as AlertIcon,
  User as UserIcon,
  Users as UsersIcon,
  ArrowLeft as ArrowLeftIcon
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

  const { 
    data: classesData, 
    loading: classesLoading,
    error: classesError 
  } = useParadiseApi<{success: boolean, classes: DanceClass[]}>('/classes?active=true')

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
      
      console.log('Session data:', data)
      
      if (data.success && data.sessions.length > 0) {
        const session = data.sessions[0]
        console.log('Session enrollments:', session.danceClass.enrollments)
        
        setCurrentSession(session)
        
        const enrolledStudents = session.danceClass.enrollments.map((enrollment: any) => ({
          id: enrollment.student.id,
          name: enrollment.student.name,
          avatar: enrollment.student.avatar || "/placeholder.svg",
          hasDebt: enrollment.student.hasDebt,
          status: session.attendances.find((att: any) => att.student.id === enrollment.student.id)?.status?.toLowerCase() || undefined
        }))
        
        console.log('Processed students:', enrolledStudents)
        setStudents(enrolledStudents)
      } else {
        console.log('No session found or error:', data)
        toast({
          title: "❌ No hay sesión hoy",
          description: "No hay una sesión programada para hoy en esta clase",
          variant: "destructive",
        })
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
      console.log('Loading session for class:', selectedClass)
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

  const handleAttendanceAndNext = async (studentId: number, status: string) => {
    await markAttendance(studentId, status)
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(prev => prev + 1)
    } else {
      setSelectedClass(null)
      setCurrentStudentIndex(0)
      toast({
        title: "✅ Completado",
        description: "Has terminado de tomar asistencia",
      })
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
      case 'present': return <Check className="h-4 w-4 text-white" />
      case 'absent': return <X className="h-4 w-4 text-white" />
      case 'late': return <ClockIcon className="h-4 w-4 text-white" />
      case 'change_request': return <AlertIcon className="h-4 w-4 text-white" />
      default: return <UserIcon className="h-4 w-4 text-gray-500" />
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
      <div className="w-full h-full flex items-center justify-center p-4">
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
    <div className="w-full h-full bg-gray-900">
      {!selectedClass ? (
        <div className="w-full p-4 md:p-8">
          <div className="max-w-2xl w-full mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
              Toma de Asistencia
            </h1>
            
            <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
              <CardContent className="p-6 md:p-8">
                <Label className="text-xl font-semibold text-white mb-4 block">
                  Selecciona una Clase
                </Label>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {classes.map((danceClass) => (
                    <Button
                      key={danceClass.id}
                      onClick={() => setSelectedClass(danceClass.id)}
                      className="w-full h-auto p-4 bg-gray-700/50 hover:bg-gray-700 text-left flex items-center space-x-4 rounded-xl border border-gray-600"
                    >
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg font-bold">
                          {danceClass.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg text-white truncate">
                          {danceClass.name}
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          Instructor: {danceClass.trainer.name}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : !currentSession ? (
        <div className="w-full p-4 flex items-center justify-center">
          <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">No hay clase hoy</h3>
              <p className="text-gray-400 text-sm">No hay sesión programada para hoy</p>
              <Button
                onClick={() => setSelectedClass(null)}
                className="mt-4 w-full"
                variant="outline"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Volver a selección
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : currentSession.danceClass.enrollments.length === 0 ? (
        <div className="w-full p-4 flex items-center justify-center">
          <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Sin estudiantes</h3>
              <p className="text-gray-400 text-sm">No hay estudiantes inscritos en esta clase</p>
              <Button
                onClick={() => setSelectedClass(null)}
                className="mt-4 w-full"
                variant="outline"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Volver a selección
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : currentStudent ? (
        <div className="w-full flex flex-col bg-gradient-to-b from-gray-800 to-gray-900">
          {/* Header con botón de retroceso */}
          <div className="sticky top-0 z-10 p-4 flex items-center border-b border-gray-700 bg-gray-800">
            <Button
              variant="ghost"
              onClick={() => setSelectedClass(null)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Button>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-white">
                {currentSession.danceClass.name}
              </h2>
              <p className="text-sm text-gray-400">
                {currentStudentIndex + 1} de {students.length} estudiantes
              </p>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="w-full flex space-x-1 p-2 bg-gray-800/50 sticky top-[72px] z-10">
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
          <div className="flex-1 w-full flex flex-col items-center p-4 md:p-6 overflow-y-auto">
            {/* Avatar y Nombre */}
            <div className="text-center mb-8 md:mb-12 mt-4">
              <Avatar className="w-32 h-32 md:w-48 md:h-48 mx-auto ring-4 md:ring-8 ring-blue-500/30">
                <AvatarImage src={currentStudent.avatar} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-4xl md:text-5xl font-bold text-white">
                  {currentStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 md:mt-6 text-2xl md:text-3xl font-bold text-white">{currentStudent.name}</h2>
              {currentStudent.hasDebt && (
                <Badge className="mt-2 md:mt-3 bg-red-500/20 text-red-400 border-red-500 text-base md:text-lg px-3 md:px-4 py-1 md:py-2">
                  Tiene deuda pendiente
                </Badge>
              )}
            </div>

            {/* Estado Actual */}
            {currentStudent.status && (
              <div className="mb-8 md:mb-12">
                <Badge 
                  className={`${getStatusColor(currentStudent.status)} text-white px-4 md:px-6 py-2 md:py-3 text-lg md:text-xl`}
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
          <div className="w-full p-4 md:p-6 space-y-3 md:space-y-4 bg-gray-800/50 border-t border-gray-700 sticky bottom-0">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Button
                onClick={() => handleAttendanceAndNext(currentStudent.id, 'present')}
                className={`h-16 md:h-20 rounded-xl md:rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                  currentStudent.status === 'present' 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                <Check className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3" />
                Presente
              </Button>
              
              <Button
                onClick={() => handleAttendanceAndNext(currentStudent.id, 'absent')}
                className={`h-16 md:h-20 rounded-xl md:rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                  currentStudent.status === 'absent' 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                }`}
              >
                <X className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3" />
                Ausente
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Button
                onClick={() => handleAttendanceAndNext(currentStudent.id, 'late')}
                className={`h-16 md:h-20 rounded-xl md:rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                  currentStudent.status === 'late' 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                }`}
              >
                <ClockIcon className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3" />
                Tarde
              </Button>
              
              <Button
                onClick={() => handleAttendanceAndNext(currentStudent.id, 'change_request')}
                className={`h-16 md:h-20 rounded-xl md:rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                  currentStudent.status === 'change_request' 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                }`}
              >
                <AlertIcon className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3" />
                Cambio
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
} 