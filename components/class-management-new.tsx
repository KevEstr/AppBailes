"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Users,
  Plus,
  Calendar,
  Clock,
  Edit,
  Trash2,
  UserPlus,
  BookOpen,
  GraduationCap,
  MapPin
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Trainer {
  id: number
  name: string
  email: string
}

interface Student {
  id: number // Cédula del estudiante
  name: string
  email: string
  phone: string
  avatar?: string
  hasDebt: boolean
}

interface ClassSchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface DanceClass {
  id: number
  name: string
  description?: string
  capacity: number
  price?: number
  trainer: Trainer
  schedules: ClassSchedule[]
  enrollments: {
    student: Student
  }[]
  _count: {
    enrollments: number
  }
}

const DAYS_OF_WEEK = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
]

export function ClassManagementNew() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedClass, setSelectedClass] = useState<DanceClass | null>(null)
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)

  // Formulario para nueva clase - memoizado
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    trainerId: 0,
    capacity: 20,
    price: 0,
    schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
  })

  // ✅ OPTIMIZACIÓN: useCallback para loadData
  const loadData = useCallback(async () => {
    try {
      const [classesRes, trainersRes, studentsRes] = await Promise.all([
        fetch('/api/classes?active=true'),
        fetch('/api/trainers?active=true'),
        fetch('/api/students?active=true')
      ])

      const [classesData, trainersData, studentsData] = await Promise.all([
        classesRes.json(),
        trainersRes.json(),
        studentsRes.json()
      ])

      if (classesData.success) setClasses(classesData.classes)
      if (trainersData.success) setTrainers(trainersData.trainers)
      if (studentsData.success) setStudents(studentsData.students)
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ✅ OPTIMIZACIÓN: createClass sin recargar todo
  const createClass = useCallback(async () => {
    if (!newClass.name || !newClass.trainerId) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClass,
          trainerId: Number(newClass.trainerId)
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Clase creada",
          description: `${newClass.name} ha sido creada exitosamente`
        })
        setShowCreateDialog(false)
        
        // ✅ OPTIMIZACIÓN: Solo agregar la nueva clase sin recargar
        const newClassWithTrainer = {
          ...data.class,
          trainer: trainers.find(t => t.id === Number(newClass.trainerId))!,
          enrollments: [],
          _count: { enrollments: 0 }
        }
        setClasses(prev => [...prev, newClassWithTrainer])
        
        // Reset form
        setNewClass({
          name: '',
          description: '',
          trainerId: 0,
          capacity: 20,
          price: 0,
          schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
        })
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo crear la clase",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al crear la clase",
        variant: "destructive"
      })
    }
  }, [newClass, trainers, toast])

  // ✅ OPTIMIZACIÓN: enrollStudent sin recargar todo
  const enrollStudent = useCallback(async (studentId: number, classId: number) => {
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classId })
      })

      const data = await response.json()

      if (data.success) {
        const student = students.find(s => s.id === studentId)
        toast({
          title: "✅ Inscripción exitosa",
          description: `${student?.name} ha sido inscrito en la clase`
        })
        
        // ✅ OPTIMIZACIÓN: Solo actualizar la clase específica
        setClasses(prev => prev.map(cls => 
          cls.id === classId 
            ? {
                ...cls,
                enrollments: [...cls.enrollments, { student: student! }],
                _count: { enrollments: cls._count.enrollments + 1 }
              }
            : cls
        ))
        
        setShowEnrollDialog(false)
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo inscribir al estudiante",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al inscribir estudiante",
        variant: "destructive"
      })
    }
  }, [students, toast])

  // ✅ OPTIMIZACIÓN: unenrollStudent sin recargar todo
  const unenrollStudent = useCallback(async (studentId: number, classId: number) => {
    try {
      const response = await fetch(`/api/enrollments?studentId=${studentId}&classId=${classId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        const student = students.find(s => s.id === studentId)
        toast({
          title: "✅ Estudiante desinscrito",
          description: `${student?.name} ha sido desinscrito de la clase`
        })
        
        // ✅ OPTIMIZACIÓN: Solo actualizar la clase específica
        setClasses(prev => prev.map(cls => 
          cls.id === classId 
            ? {
                ...cls,
                enrollments: cls.enrollments.filter(e => e.student.id !== studentId),
                _count: { enrollments: cls._count.enrollments - 1 }
              }
            : cls
        ))
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo desinscribir al estudiante",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al desinscribir estudiante",
        variant: "destructive"
      })
    }
  }, [students, toast])

  // ✅ OPTIMIZACIÓN: deleteClass sin recargar todo
  const deleteClass = useCallback(async (classId: number) => {
    try {
      const response = await fetch(`/api/classes?id=${classId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Clase eliminada",
          description: "La clase ha sido eliminada exitosamente"
        })
        
        // ✅ OPTIMIZACIÓN: Solo remover la clase del estado
        setClasses(prev => prev.filter(cls => cls.id !== classId))
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo eliminar la clase",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al eliminar la clase",
        variant: "destructive"
      })
    }
  }, [toast])

  // ✅ OPTIMIZACIÓN: Funciones memoizadas
  const addSchedule = useCallback(() => {
    setNewClass(prev => ({
      ...prev,
      schedules: [...prev.schedules, { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
    }))
  }, [])

  const removeSchedule = useCallback((index: number) => {
    setNewClass(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }))
  }, [])

  const updateSchedule = useCallback((index: number, field: string, value: any) => {
    setNewClass(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => 
        i === index ? { ...schedule, [field]: value } : schedule
      )
    }))
  }, [])

  // ✅ OPTIMIZACIÓN: Estudiantes disponibles memoizados
  const availableStudents = useMemo(() => {
    if (!selectedClass) return students
    const enrolledIds = selectedClass.enrollments.map(e => e.student.id)
    return students.filter(student => !enrolledIds.includes(student.id))
  }, [selectedClass, students])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse border-0 shadow-xl rounded-3xl">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Gestión</span>
                <p className="text-blue-300 mt-2">Administra clases de baile y estudiantes</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-blue-600/60 hover:bg-blue-700/60 border border-blue-500 text-white text-lg px-6 py-3 rounded-2xl hover:text-white backdrop-blur-sm"
                >
                  <Plus className="w-6 h-6 mr-2 text-white" />
                  Nueva Clase
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border border-gray-600 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-white">Crear Nueva Clase de Baile</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-200 font-semibold">Nombre de la Clase *</Label>
                      <Input
                        id="name"
                        value={newClass.name}
                        onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                        placeholder="ej: Salsa Avanzada"
                        className="border border-gray-600 focus:border-blue-500 bg-gray-700 text-white placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity" className="text-gray-200 font-semibold">Capacidad</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={newClass.capacity}
                        onChange={(e) => setNewClass({ ...newClass, capacity: parseInt(e.target.value) || 20 })}
                        className="border border-gray-600 focus:border-blue-500 bg-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trainer" className="text-gray-200 font-semibold">Instructor *</Label>
                      <Select 
                        value={newClass.trainerId.toString()} 
                        onValueChange={(value) => setNewClass({ ...newClass, trainerId: parseInt(value) })}
                      >
                        <SelectTrigger className="border border-gray-600 focus:border-blue-500 bg-gray-700 text-white">
                          <SelectValue placeholder="Selecciona un instructor" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {trainers.map((trainer) => (
                            <SelectItem key={trainer.id} value={trainer.id.toString()} className="text-white hover:bg-blue-600">
                              {trainer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price" className="text-gray-200 font-semibold">Valor por Clase</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newClass.price}
                        onChange={(e) => setNewClass({ ...newClass, price: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="border border-gray-600 focus:border-blue-500 bg-gray-700 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-gray-200 font-semibold">Descripción del Estilo de Baile</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      placeholder="Describe el tipo de clase y nivel..."
                      className="border border-gray-600 focus:border-blue-500 bg-gray-700 text-white placeholder:text-gray-400"
                    />
                  </div>

                  {/* Horarios */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-lg font-semibold text-gray-200">Horarios</Label>
                      <Button onClick={addSchedule} variant="outline" size="sm" className="border-blue-500 text-blue-400 hover:bg-blue-950 hover:text-blue-300">
                        <Plus className="h-4 w-4 mr-2 text-blue-400" />
                        Agregar Horario
                      </Button>
                    </div>

                    {newClass.schedules.map((schedule, index) => (
                      <Card key={index} className="mb-4 p-4 bg-gray-700 border border-gray-600">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-5">
                            <Label className="text-gray-200 font-medium">Día de la semana</Label>
                            <Select 
                              value={schedule.dayOfWeek.toString()} 
                              onValueChange={(value) => updateSchedule(index, 'dayOfWeek', parseInt(value))}
                            >
                              <SelectTrigger className="border border-gray-600 focus:border-blue-500 bg-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-600 border-gray-600">
                                {DAYS_OF_WEEK.map((day, dayIndex) => (
                                  <SelectItem key={dayIndex} value={dayIndex.toString()} className="text-white hover:bg-blue-600">
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-gray-200 font-medium">Hora inicio</Label>
                            <Input
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) => updateSchedule(index, 'startTime', e.target.value)}
                              className="border border-gray-600 focus:border-blue-500 bg-gray-600 text-white"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-gray-200 font-medium">Hora fin</Label>
                            <Input
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) => updateSchedule(index, 'endTime', e.target.value)}
                              className="border border-gray-600 focus:border-blue-500 bg-gray-600 text-white"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button 
                              onClick={() => removeSchedule(index)} 
                              variant="outline" 
                              size="sm"
                              disabled={newClass.schedules.length === 1}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                      Cancelar
                    </Button>
                    <Button onClick={createClass} disabled={!newClass.name || !newClass.trainerId} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Crear Clase
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Lista de clases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((danceClass) => (
          <Card key={danceClass.id} className="border-0 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardContent className="p-8">
              {/* Header de la clase */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{danceClass.name}</h3>
                  <p className="text-gray-300 mb-3">{danceClass.description || "Sin descripción"}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <GraduationCap className="h-4 w-4" />
                    <span>{danceClass.trainer.name}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => deleteClass(danceClass.id)} className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>

              {/* Horarios */}
              <div className="mb-6">
                <h4 className="font-semibold text-blue-400 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Horarios
                </h4>
                <div className="space-y-2">
                  {danceClass.schedules.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-700/80 rounded-lg border border-gray-600">
                      <span className="font-medium text-blue-300">{DAYS_OF_WEEK[schedule.dayOfWeek]}</span>
                      <span className="text-gray-300">{schedule.startTime} - {schedule.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-950/50 rounded-lg border border-blue-500">
                  <div className="text-2xl font-bold text-blue-400">{danceClass._count.enrollments}</div>
                  <div className="text-sm text-blue-300">Inscritos</div>
                </div>
                <div className="text-center p-3 bg-green-950/50 rounded-lg border border-green-500">
                  <div className="text-2xl font-bold text-green-400">{danceClass.capacity}</div>
                  <div className="text-sm text-green-300">Capacidad</div>
                </div>
              </div>

              {/* Estudiantes inscritos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-400 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Estudiantes ({danceClass.enrollments.length})
                  </h4>
                  <Dialog open={showEnrollDialog && selectedClass?.id === danceClass.id} onOpenChange={setShowEnrollDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedClass(danceClass)}
                        className="border-blue-500 text-blue-400 hover:bg-blue-950 hover:text-blue-300"
                      >
                        <UserPlus className="h-4 w-4 mr-1 text-blue-400" />
                        Inscribir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border border-gray-600 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Inscribir Estudiante en {danceClass.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {availableStudents.length === 0 ? (
                          <p className="text-gray-400 text-sm">No hay estudiantes disponibles para inscribir</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableStudents.map((student) => (
                              <div key={student.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                                <div>
                                  <span className="font-medium text-white">{student.name}</span>
                                  <div className="text-sm text-gray-400">Cédula: {student.id}</div>
                                  {student.hasDebt && (
                                    <Badge variant="destructive" className="text-xs">Tiene deuda</Badge>
                                  )}
                                </div>
                                <Button 
                                  size="sm" 
                                  onClick={() => enrollStudent(student.id, danceClass.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  Inscribir
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {danceClass.enrollments.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay estudiantes inscritos</p>
                  ) : (
                    danceClass.enrollments.map((enrollment) => (
                      <div key={enrollment.student.id} className="flex items-center justify-between p-2 bg-gray-700/80 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div>
                            <span className="font-medium text-blue-300">{enrollment.student.name}</span>
                            <div className="text-xs text-gray-400">Cédula: {enrollment.student.id}</div>
                          </div>
                          {enrollment.student.hasDebt && (
                            <Badge variant="destructive" className="text-xs">Deuda</Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => unenrollStudent(enrollment.student.id, danceClass.id)}
                          className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Información adicional */}
              {danceClass.price && (
                <div className="pt-4 border-t border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Precio por clase:</span>
                    <span className="text-lg font-bold text-green-400">${danceClass.price}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length === 0 && (
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center border-2 border-purple-500">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">No hay clases creadas</h3>
            <p className="text-gray-300 text-xl">Crea tu primera clase para comenzar</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 