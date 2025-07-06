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
  } = useParadiseApi<{success: boolean, classes: DanceClass[]}>('/api/classes')

  useEffect(() => {
    console.log('Classes data:', classesData)
    console.log('Loading state:', classesLoading)
    console.log('Error state:', classesError)

    if (classesData?.success) {
      console.log('Setting classes:', classesData.classes)
      setClasses(classesData.classes)
      setLoading(false)
    } else if (classesError) {
      console.error('Error loading classes:', classesError)
      toast({
        title: "Error al cargar clases",
        description: "No se pudieron cargar las clases. Por favor, intenta de nuevo.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }, [classesData, classesError, toast])

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

  if (loading || classesLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando clases...</p>
        </div>
      </div>
    )
  }

  if (classesError) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="text-center">
          <AlertIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error al cargar clases</h3>
          <p className="text-gray-400">No se pudieron cargar las clases. Por favor, intenta de nuevo.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const currentStudent = students[currentStudentIndex]

  return (
    <div className="w-full h-full bg-gray-900">
      {!selectedClass ? (
        <div className="w-full p-4 md:p-6">
          <div className="w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Toma de Asistencia
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                {classes.length} clases disponibles
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {classes.map((danceClass) => (
                <Button
                  key={danceClass.id}
                  onClick={() => setSelectedClass(danceClass.id)}
                  className="h-auto p-4 bg-gray-800 hover:bg-gray-700 text-left flex items-center space-x-4 rounded-xl border border-gray-700 transition-all duration-200 hover:border-gray-600 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-200">
                    <span className="text-white text-lg font-bold">
                      {danceClass.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg text-white truncate">
                      {danceClass.name}
                    </div>
                    <div className="text-sm text-gray-400 truncate flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      {danceClass.trainer.name}
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {(!classes || classes.length === 0) && (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No hay clases disponibles</h3>
                <p className="text-gray-500">No se encontraron clases activas en este momento</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-4"
                  variant="outline"
                >
                  Recargar
                </Button>
              </div>
            )}
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
        <div className="w-full flex flex-col bg-gradient-to-b from-gray-800 to-gray-900 relative">
          {/* Header con botón de retroceso */}
          <div className="sticky top-0 z-20 p-4 flex items-center border-b border-gray-700 bg-gray-800/95 backdrop-blur-sm">
            <Button
              variant="ghost"
              onClick={() => setSelectedClass(null)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5" />
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
          <div className="w-full flex space-x-1 p-2 bg-gray-800/95 backdrop-blur-sm sticky top-[72px] z-20">
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

          {/* Contenido Principal */}
          <div className="flex-1 w-full flex flex-col items-center justify-between min-h-[calc(100vh-8rem)]">
            {/* Contenido del Estudiante */}
            <div className="w-full flex flex-col items-center p-4 md:p-6">
              {/* Avatar y Nombre */}
              <div className="text-center mb-6 md:mb-8 mt-4">
                <Avatar className="w-28 h-28 md:w-36 md:h-36 mx-auto ring-4 ring-blue-500/30">
                  <AvatarImage src={currentStudent.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-3xl md:text-4xl font-bold text-white">
                    {currentStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl md:text-2xl font-bold text-white">{currentStudent.name}</h2>
                {currentStudent.hasDebt && (
                  <Badge className="mt-2 bg-red-500/20 text-red-400 border-red-500 text-sm md:text-base px-3 py-1">
                    Tiene deuda pendiente
                  </Badge>
                )}
              </div>

              {/* Estado Actual */}
              {currentStudent.status && (
                <div className="mb-6">
                  <Badge 
                    className={`${getStatusColor(currentStudent.status)} text-white px-4 py-2 text-base md:text-lg`}
                  >
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(currentStudent.status)}
                      <span>{getStatusText(currentStudent.status)}</span>
                    </div>
                  </Badge>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="w-full p-4 space-y-2 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700">
              <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'present')}
                  className={`h-12 md:h-14 rounded-xl text-base md:text-lg font-medium transition-all duration-300 ${
                    currentStudent.status === 'present' 
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20' 
                      : 'bg-green-600/10 hover:bg-green-600/20 text-green-500 hover:text-green-400'
                  }`}
                >
                  <Check className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                  Presente
                </Button>
                
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'absent')}
                  className={`h-12 md:h-14 rounded-xl text-base md:text-lg font-medium transition-all duration-300 ${
                    currentStudent.status === 'absent' 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' 
                      : 'bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400'
                  }`}
                >
                  <X className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                  Ausente
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'late')}
                  className={`h-12 md:h-14 rounded-xl text-base md:text-lg font-medium transition-all duration-300 ${
                    currentStudent.status === 'late' 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-600/20' 
                      : 'bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 hover:text-yellow-400'
                  }`}
                >
                  <ClockIcon className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                  Tarde
                </Button>
                
                <Button
                  onClick={() => handleAttendanceAndNext(currentStudent.id, 'change_request')}
                  className={`h-12 md:h-14 rounded-xl text-base md:text-lg font-medium transition-all duration-300 ${
                    currentStudent.status === 'change_request' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' 
                      : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 hover:text-blue-400'
                  }`}
                >
                  <AlertIcon className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                  Cambio
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
} 