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
  id: string
  name: string
  email: string
}

interface Student {
  id: string
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
  id: string
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
    trainerId: '',
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
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass)
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
          trainerId: '',
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

  const enrollStudent = async (studentId: string, classId: string) => {
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

  const unenrollStudent = async (studentId: string, classId: string) => {
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

  const addSchedule = () => {
    setNewClass(prev => ({
      ...prev,
      schedules: [...prev.schedules, { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
    }))
  }

  const removeSchedule = (index: number) => {
    setNewClass(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }))
  }

  const updateSchedule = (index: number, field: string, value: any) => {
    setNewClass(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => 
        i === index ? { ...schedule, [field]: value } : schedule
      )
    }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando gestión de clases...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-2xl rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <span className="text-3xl font-bold">Gestión de Clases</span>
                <p className="text-purple-200 mt-2">Clases, horarios e inscripciones</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0">
                  <Plus className="h-5 w-5 mr-2" />
                  Nueva Clase
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Clase</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre de la Clase</Label>
                      <Input
                        id="name"
                        value={newClass.name}
                        onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="ej: Salsa Básica"
                      />
                    </div>
                    <div>
                      <Label htmlFor="trainer">Entrenador</Label>
                      <Select 
                        value={newClass.trainerId} 
                        onValueChange={(value) => setNewClass(prev => ({ ...prev, trainerId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar entrenador" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainers.map(trainer => (
                            <SelectItem key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={newClass.description}
                      onChange={(e) => setNewClass(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción de la clase..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="capacity">Capacidad</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={newClass.capacity}
                        onChange={(e) => setNewClass(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Precio (opcional)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newClass.price}
                        onChange={(e) => setNewClass(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label>Horarios</Label>
                      <Button onClick={addSchedule} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Horario
                      </Button>
                    </div>
                    {newClass.schedules.map((schedule, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-end">
                        <div className="col-span-4">
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
                          <Input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => updateSchedule(index, 'startTime', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => updateSchedule(index, 'endTime', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
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
                    ))}
                  </div>

                  <div className="flex justify-end space-x-3">
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

      {/* Lista de Clases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((danceClass) => (
          <Card key={danceClass.id} className="border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">{danceClass.name}</CardTitle>
                  <p className="text-slate-600 mt-1">Entrenador: {danceClass.trainer.name}</p>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {danceClass._count.enrollments}/{danceClass.capacity}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {danceClass.description && (
                <p className="text-slate-600 text-sm">{danceClass.description}</p>
              )}

              {/* Horarios */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Horarios</span>
                </div>
                <div className="space-y-1">
                  {danceClass.schedules.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium">{DAYS_OF_WEEK[schedule.dayOfWeek]}</span>
                      <div className="flex items-center space-x-1 text-sm text-slate-600">
                        <Clock className="h-3 w-3" />
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estudiantes Inscritos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Estudiantes</span>
                  </div>
                  <Dialog open={showEnrollDialog && selectedClass?.id === danceClass.id} 
                         onOpenChange={(open) => {
                           setShowEnrollDialog(open)
                           if (open) setSelectedClass(danceClass)
                         }}>
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
                        <DialogTitle>Inscribir Estudiante - {danceClass.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {students
                          .filter(student => !danceClass.enrollments.find(e => e.student.id === student.id))
                          .map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-slate-600">{student.email}</p>
                                {student.hasDebt && (
                                  <Badge variant="destructive" className="text-xs mt-1">
                                    Deuda Pendiente
                                  </Badge>
                                )}
                              </div>
                              <Button 
                                onClick={() => enrollStudent(student.id, danceClass.id)}
                                size="sm"
                              >
                                Inscribir
                              </Button>
                            </div>
                          ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-2">
                  {danceClass.enrollments.slice(0, 3).map((enrollment) => (
                    <div key={enrollment.student.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-600">
                            {enrollment.student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm">{enrollment.student.name}</span>
                      </div>
                      <Button
                        onClick={() => unenrollStudent(enrollment.student.id, danceClass.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {danceClass.enrollments.length > 3 && (
                    <p className="text-xs text-slate-500 text-center">
                      +{danceClass.enrollments.length - 3} más
                    </p>
                  )}
                </div>
              </div>

              {danceClass.price && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-slate-600">Precio</span>
                  <span className="font-bold text-lg text-green-600">${danceClass.price}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length === 0 && (
        <Card className="border-0 shadow-xl rounded-2xl">
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-xl">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">No hay clases registradas</h3>
            <p className="text-slate-600">Comienza creando tu primera clase de baile</p>
            <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
              <Plus className="h-5 w-5 mr-2" />
              Crear Primera Clase
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 