"use client"

import { useState, useEffect } from "react"
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

  // Formulario para nueva clase
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    trainerId: 0,
    capacity: 20,
    price: 0,
    schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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
  }

  const createClass = async () => {
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
          trainerId: Number(newClass.trainerId) // Asegurar que sea número
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Clase creada",
          description: `${newClass.name} ha sido creada exitosamente`
        })
        setShowCreateDialog(false)
        setNewClass({
          name: '',
          description: '',
          trainerId: 0,
          capacity: 20,
          price: 0,
          schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
        })
        loadData()
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
  }

  const enrollStudent = async (studentId: number, classId: number) => {
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
        loadData()
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
  }

  const unenrollStudent = async (studentId: number, classId: number) => {
    try {
      const response = await fetch(`/api/enrollments?studentId=${studentId}&classId=${classId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Inscripción cancelada",
          description: "El estudiante ha sido removido de la clase"
        })
        loadData()
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo cancelar la inscripción",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al cancelar inscripción",
        variant: "destructive"
      })
    }
  }

  const deleteClass = async (classId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta clase?')) return

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
        loadData()
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
  }

  const addSchedule = () => {
    setNewClass({
      ...newClass,
      schedules: [...newClass.schedules, { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
    })
  }

  const removeSchedule = (index: number) => {
    if (newClass.schedules.length === 1) return
    setNewClass({
      ...newClass,
      schedules: newClass.schedules.filter((_, i) => i !== index)
    })
  }

  const updateSchedule = (index: number, field: string, value: any) => {
    const newSchedules = [...newClass.schedules]
    newSchedules[index] = { ...newSchedules[index], [field]: value }
    setNewClass({ ...newClass, schedules: newSchedules })
  }

  const getAvailableStudents = () => {
    if (!selectedClass) return students
    const enrolledIds = selectedClass.enrollments.map(e => e.student.id)
    return students.filter(s => !enrolledIds.includes(s.id))
  }

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
      <Card className="border-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-2xl mb-8 rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <span className="text-3xl font-bold">Gestión de Clases</span>
                <p className="text-purple-200 mt-2 text-lg">Administra clases, horarios e inscripciones</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-white/20 hover:bg-white/30 border-white/30 text-white text-lg px-6 py-3 rounded-2xl"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nueva Clase
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Crear Nueva Clase</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre de la Clase *</Label>
                      <Input
                        id="name"
                        value={newClass.name}
                        onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                        placeholder="ej: Salsa Básica"
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity">Capacidad</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={newClass.capacity}
                        onChange={(e) => setNewClass({ ...newClass, capacity: parseInt(e.target.value) || 20 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trainer">Entrenador *</Label>
                      <Select 
                        value={newClass.trainerId.toString()} 
                        onValueChange={(value) => setNewClass({ ...newClass, trainerId: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un entrenador" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainers.map((trainer) => (
                            <SelectItem key={trainer.id} value={trainer.id.toString()}>
                              {trainer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Precio por Clase</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newClass.price}
                        onChange={(e) => setNewClass({ ...newClass, price: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      placeholder="Descripción de la clase..."
                    />
                  </div>

                  {/* Horarios */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-lg font-semibold">Horarios</Label>
                      <Button onClick={addSchedule} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Horario
                      </Button>
                    </div>

                    {newClass.schedules.map((schedule, index) => (
                      <Card key={index} className="mb-4 p-4">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-5">
                            <Label>Día de la semana</Label>
                            <Select 
                              value={schedule.dayOfWeek.toString()} 
                              onValueChange={(value) => updateSchedule(index, 'dayOfWeek', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map((day, dayIndex) => (
                                  <SelectItem key={dayIndex} value={dayIndex.toString()}>
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label>Hora inicio</Label>
                            <Input
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) => updateSchedule(index, 'startTime', e.target.value)}
                            />
                          </div>
                          <div className="col-span-3">
                            <Label>Hora fin</Label>
                            <Input
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) => updateSchedule(index, 'endTime', e.target.value)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button 
                              onClick={() => removeSchedule(index)} 
                              variant="destructive" 
                              size="sm"
                              disabled={newClass.schedules.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={createClass} disabled={!newClass.name || !newClass.trainerId}>
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
          <Card key={danceClass.id} className="border-0 shadow-2xl rounded-3xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-8">
              {/* Header de la clase */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{danceClass.name}</h3>
                  <p className="text-slate-600 mb-3">{danceClass.description || "Sin descripción"}</p>
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <GraduationCap className="h-4 w-4" />
                    <span>{danceClass.trainer.name}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => deleteClass(danceClass.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Horarios */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Horarios
                </h4>
                <div className="space-y-2">
                  {danceClass.schedules.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{DAYS_OF_WEEK[schedule.dayOfWeek]}</span>
                      <span className="text-slate-600">{schedule.startTime} - {schedule.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{danceClass._count.enrollments}</div>
                  <div className="text-sm text-blue-600">Inscritos</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{danceClass.capacity}</div>
                  <div className="text-sm text-green-600">Capacidad</div>
                </div>
              </div>

              {/* Estudiantes inscritos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Estudiantes ({danceClass.enrollments.length})
                  </h4>
                  <Dialog open={showEnrollDialog && selectedClass?.id === danceClass.id} onOpenChange={setShowEnrollDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedClass(danceClass)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Inscribir
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Inscribir Estudiante en {danceClass.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {getAvailableStudents().length === 0 ? (
                          <p className="text-slate-600">No hay estudiantes disponibles para inscribir</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {getAvailableStudents().map((student) => (
                              <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                  <span className="font-medium">{student.name}</span>
                                  <div className="text-sm text-slate-500">Cédula: {student.id}</div>
                                  {student.hasDebt && (
                                    <Badge variant="destructive" className="text-xs">Tiene deuda</Badge>
                                  )}
                                </div>
                                <Button 
                                  size="sm" 
                                  onClick={() => enrollStudent(student.id, danceClass.id)}
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
                    <p className="text-slate-500 text-sm">No hay estudiantes inscritos</p>
                  ) : (
                    danceClass.enrollments.map((enrollment) => (
                      <div key={enrollment.student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div>
                            <span className="font-medium text-slate-700">{enrollment.student.name}</span>
                            <div className="text-xs text-slate-500">Cédula: {enrollment.student.id}</div>
                          </div>
                          {enrollment.student.hasDebt && (
                            <Badge variant="destructive" className="text-xs">Deuda</Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => unenrollStudent(enrollment.student.id, danceClass.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Información adicional */}
              {danceClass.price && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Precio por clase:</span>
                    <span className="text-lg font-bold text-green-600">${danceClass.price}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length === 0 && (
        <Card className="border-0 shadow-2xl rounded-3xl">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-4">No hay clases creadas</h3>
            <p className="text-slate-600 text-xl">Crea tu primera clase para comenzar</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 