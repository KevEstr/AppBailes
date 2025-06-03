"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Pause
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Student {
  id: string
  name: string
  avatar?: string
  group: string
}

interface Attendance {
  id?: string
  studentId: string
  classId: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'CHANGE_REQUEST'
  student: Student
}

interface ActiveClass {
  id: string
  name: string
  group: string
  date: string
  startTime: string
  endTime: string
  trainer: {
    id: string
    name: string
  }
}

export default function ClassAttendanceTikTok() {
  const [activeClass, setActiveClass] = useState<ActiveClass | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchActiveClass()
    fetchStudents()
  }, [])

  useEffect(() => {
    if (activeClass) {
      fetchAttendances()
    }
  }, [activeClass])

  const fetchActiveClass = async () => {
    try {
      const response = await fetch('/api/classes?active=true')
      const data = await response.json()
      if (data.success && data.classes.length > 0) {
        setActiveClass(data.classes[0])
      }
    } catch (error) {
      console.error('Error fetching active class:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      const data = await response.json()
      if (data.success) {
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAttendances = async () => {
    if (!activeClass) return
    
    try {
      const response = await fetch(`/api/attendance/class?classId=${activeClass.id}`)
      const data = await response.json()
      if (data.success) {
        setAttendances(data.attendances)
      }
    } catch (error) {
      console.error('Error fetching attendances:', error)
    }
  }

  const markAttendance = async (studentId: string, status: Attendance['status']) => {
    if (!activeClass) return

    try {
      const response = await fetch('/api/attendance/class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          classId: activeClass.id,
          status
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        fetchAttendances()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      toast.error('Error al marcar asistencia')
    }
  }

  const getStudentAttendance = (studentId: string) => {
    return attendances.find(a => a.studentId === studentId)
  }

  const getStatusColor = (status: Attendance['status']) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-500'
      case 'ABSENT': return 'bg-red-500'
      case 'LATE': return 'bg-yellow-500'
      case 'CHANGE_REQUEST': return 'bg-blue-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusIcon = (status: Attendance['status']) => {
    switch (status) {
      case 'PRESENT': return <CheckCircle className="h-4 w-4 text-white" />
      case 'ABSENT': return <XCircle className="h-4 w-4 text-white" />
      case 'LATE': return <Clock className="h-4 w-4 text-white" />
      case 'CHANGE_REQUEST': return <AlertTriangle className="h-4 w-4 text-white" />
      default: return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: Attendance['status']) => {
    switch (status) {
      case 'PRESENT': return 'Presente'
      case 'ABSENT': return 'Ausente'
      case 'LATE': return 'Tardanza'
      case 'CHANGE_REQUEST': return 'Cambio'
      default: return 'Sin marcar'
    }
  }

  const filteredStudents = activeClass 
    ? students.filter(student => student.group === activeClass.group)
    : []

  const presentCount = attendances.filter(a => a.status === 'PRESENT').length
  const absentCount = attendances.filter(a => a.status === 'ABSENT').length
  const lateCount = attendances.filter(a => a.status === 'LATE').length
  const totalStudents = filteredStudents.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!activeClass) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
          <Play className="h-12 w-12 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No hay clases activas</h3>
        <p className="text-slate-600 mb-4">
          Para tomar asistencia, primero debes activar una clase desde la gestión de clases.
        </p>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl">
          <Play className="h-4 w-4 mr-2" />
          Ir a Gestión de Clases
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
              <h3 className="text-xl font-bold text-green-800">{activeClass.name}</h3>
              <p className="text-green-700">Instructor: {activeClass.trainer.name}</p>
            </div>
            <div className="text-right">
              <p className="text-green-600">
                {format(new Date(activeClass.date), 'dd MMMM yyyy', { locale: es })}
              </p>
              <p className="text-green-600">
                {format(new Date(activeClass.startTime), 'HH:mm')} - 
                {format(new Date(activeClass.endTime), 'HH:mm')}
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{presentCount}</div>
              <div className="text-sm text-green-600">Presentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700">{absentCount}</div>
              <div className="text-sm text-red-600">Ausentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-700">{lateCount}</div>
              <div className="text-sm text-yellow-600">Tardanzas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700">{totalStudents}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Estudiantes - Estilo TikTok */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const attendance = getStudentAttendance(student.id)
          const status = attendance?.status
          
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
                    <h3 className="font-bold text-slate-800">{student.name}</h3>
                    <p className="text-sm text-slate-600">{student.group}</p>
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
                    onClick={() => markAttendance(student.id, 'PRESENT')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'PRESENT' 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Presente
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(student.id, 'ABSENT')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'ABSENT' 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ausente
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(student.id, 'LATE')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'LATE' 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Tarde
                  </Button>
                  
                  <Button
                    onClick={() => markAttendance(student.id, 'CHANGE_REQUEST')}
                    size="sm"
                    className={`rounded-xl transition-all duration-300 ${
                      status === 'CHANGE_REQUEST' 
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

      {filteredStudents.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            No hay estudiantes en este grupo
          </h3>
          <p className="text-slate-500">
            Agrega estudiantes al grupo "{activeClass.group}" para poder tomar asistencia.
          </p>
        </div>
      )}
    </div>
  )
} 