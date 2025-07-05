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
  Play,
  Pause,
  GraduationCap
} from 'lucide-react'
import { useParadiseApi } from '@/hooks/use-paradise-api'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectItem, SelectValue, SelectTrigger, SelectContent } from '@radix-ui/react-select'

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
        <div className='space-y-6'>

      
      {/* Header de Clase Activa */}
      <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <h2 className="text-2xl font-bold text-green-800">Clase en Curso</h2>
            </div>
            <Badge className="bg-green-500 text-white">ACTIVA</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-xl font-bold text-green-800">{currentSession.danceClass.name}</h3>
              <p className="text-green-700">Instructor: {currentSession.danceClass.trainer.name}</p>
            </div>
            <div className="text-right">
              <p className="text-green-600">
                {new Date(currentSession.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              <p className="text-green-600">
                {new Date(currentSession.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                {new Date(currentSession.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{attendanceStats.present}</div>
              <div className="text-sm text-green-600">Presentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">{attendanceStats.absent}</div>
              <div className="text-sm text-red-600">Ausentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-700">{attendanceStats.late}</div>
              <div className="text-sm text-yellow-600">Tardanzas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700">{attendanceStats.total}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Estudiantes - Estilo TikTok */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => {      
          const status = student.status    
          return (
            <Card 
              key={student.id} 
              className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden ${
                status ? 'ring-2 ring-offset-2 ' + getStatusColor(status).replace('bg-', 'ring-') : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.avatar} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold">
                      {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{student.name}</h3>
                  </div>
                  {status && (
                    <div className={`p-2 rounded-full ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                    </div>
                  )}
                </div>

                {status && (
                  <div className="mb-4">
                    <Badge className={`${getStatusColor(status)} text-white`}>
                      {getStatusText(status)}
                    </Badge>
                  </div>
                )}

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => markAttendance(student.id, 'present')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'present' 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Presente
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(student.id, 'absent')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'absent' 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ausente
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(student.id, 'late')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'late' 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Tarde
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(student.id, 'change_request')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'change_request' 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Cambio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      </div>
      )}
      
    </div>
  )
} 