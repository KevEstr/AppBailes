"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Users, 
  Plus, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Trainer {
  id: string
  name: string
  email: string
}

interface Class {
  id: string
  name: string
  group: string
  trainerId: string
  date: string
  startTime: string
  endTime: string
  isActive: boolean
  isCompleted: boolean
  notes?: string
  trainer: Trainer
  attendances?: any[]
}

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newClass, setNewClass] = useState({
    name: '',
    group: '',
    trainerId: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: ''
  })

  const groups = [
    'Salsa Principiantes',
    'Salsa Intermedio',
    'Salsa Avanzado',
    'Bachata Principiantes',
    'Bachata Intermedio',
    'Bachata Avanzado',
    'Merengue',
    'Kizomba'
  ]

  useEffect(() => {
    fetchClasses()
    fetchTrainers()
  }, [])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      const data = await response.json()
      if (data.success) {
        setClasses(data.classes)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Error al cargar las clases')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTrainers = async () => {
    try {
      const response = await fetch('/api/trainers')
      const data = await response.json()
      if (data.success) {
        setTrainers(data.trainers)
      }
    } catch (error) {
      console.error('Error fetching trainers:', error)
    }
  }

  const createClass = async () => {
    try {
      const classDateTime = new Date(`${newClass.date}T${newClass.startTime}`)
      const endDateTime = new Date(`${newClass.date}T${newClass.endTime}`)

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClass.name,
          group: newClass.group,
          trainerId: newClass.trainerId,
          date: newClass.date,
          startTime: classDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes: newClass.notes
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Clase creada exitosamente')
        setShowCreateDialog(false)
        setNewClass({
          name: '',
          group: '',
          trainerId: '',
          date: '',
          startTime: '',
          endTime: '',
          notes: ''
        })
        fetchClasses()
      } else {
        toast.error(data.error || 'Error al crear la clase')
      }
    } catch (error) {
      console.error('Error creating class:', error)
      toast.error('Error al crear la clase')
    }
  }

  const activateClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/activate`, {
        method: 'POST'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Clase activada para toma de asistencia')
        fetchClasses()
      } else {
        toast.error(data.error || 'Error al activar la clase')
      }
    } catch (error) {
      console.error('Error activating class:', error)
      toast.error('Error al activar la clase')
    }
  }

  const deactivateClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/activate`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Clase desactivada')
        fetchClasses()
      } else {
        toast.error(data.error || 'Error al desactivar la clase')
      }
    } catch (error) {
      console.error('Error deactivating class:', error)
      toast.error('Error al desactivar la clase')
    }
  }

  const getStatusColor = (classItem: Class) => {
    if (classItem.isActive) return 'bg-green-500'
    if (classItem.isCompleted) return 'bg-gray-500'
    return 'bg-blue-500'
  }

  const getStatusText = (classItem: Class) => {
    if (classItem.isActive) return 'EN CURSO'
    if (classItem.isCompleted) return 'COMPLETADA'
    return 'PROGRAMADA'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Gestión de Clases</h2>
          <p className="text-slate-600">Control de clases y asistencia en tiempo real</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Clase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Clase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Clase</Label>
                <Input
                  id="name"
                  value={newClass.name}
                  onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                  placeholder="Ej: Salsa Principiantes - Lunes"
                />
              </div>
              
              <div>
                <Label htmlFor="group">Grupo</Label>
                <Select value={newClass.group} onValueChange={(value) => setNewClass({...newClass, group: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trainer">Instructor</Label>
                <Select value={newClass.trainerId} onValueChange={(value) => setNewClass({...newClass, trainerId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map(trainer => (
                      <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newClass.date}
                    onChange={(e) => setNewClass({...newClass, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Inicio</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newClass.startTime}
                    onChange={(e) => setNewClass({...newClass, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newClass.endTime}
                    onChange={(e) => setNewClass({...newClass, endTime: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                onClick={createClass} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={!newClass.name || !newClass.group || !newClass.trainerId || !newClass.date || !newClass.startTime || !newClass.endTime}
              >
                Crear Clase
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clase Activa */}
      {classes.find(c => c.isActive) && (
        <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse"></div>
                <CardTitle className="text-green-700">Clase en Curso</CardTitle>
              </div>
              <Badge className="bg-green-500 text-white">ACTIVA</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeClass = classes.find(c => c.isActive)!
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-green-800">{activeClass.name}</h3>
                    <p className="text-green-700">Instructor: {activeClass.trainer.name}</p>
                    <p className="text-green-600">
                      {format(new Date(activeClass.date), 'dd MMMM yyyy', { locale: es })} • 
                      {format(new Date(activeClass.startTime), 'HH:mm')} - 
                      {format(new Date(activeClass.endTime), 'HH:mm')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => deactivateClass(activeClass.id)}
                      variant="outline"
                      size="sm"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Finalizar Clase
                    </Button>
                    <Button
                      onClick={() => setSelectedClass(activeClass)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Asistencia
                    </Button>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Lista de Clases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.filter(c => !c.isActive).map((classItem) => (
          <Card key={classItem.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <div className={`h-2 ${getStatusColor(classItem)}`}></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{classItem.name}</CardTitle>
                <Badge className={`${getStatusColor(classItem)} text-white text-xs`}>
                  {getStatusText(classItem)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-slate-600">
                  <Users className="h-4 w-4 mr-2" />
                  {classItem.group}
                </div>
                <div className="flex items-center text-slate-600">
                  <BookOpen className="h-4 w-4 mr-2" />
                  {classItem.trainer.name}
                </div>
                <div className="flex items-center text-slate-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(classItem.date), 'dd MMM yyyy', { locale: es })}
                </div>
                <div className="flex items-center text-slate-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {format(new Date(classItem.startTime), 'HH:mm')} - {format(new Date(classItem.endTime), 'HH:mm')}
                </div>
              </div>

              {!classItem.isCompleted && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => activateClass(classItem.id)}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                  <Button
                    onClick={() => setSelectedClass(classItem)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Detalles de Clase */}
      {selectedClass && (
        <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedClass.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Grupo:</strong> {selectedClass.group}
                </div>
                <div>
                  <strong>Instructor:</strong> {selectedClass.trainer.name}
                </div>
                <div>
                  <strong>Fecha:</strong> {format(new Date(selectedClass.date), 'dd MMMM yyyy', { locale: es })}
                </div>
                <div>
                  <strong>Horario:</strong> {format(new Date(selectedClass.startTime), 'HH:mm')} - {format(new Date(selectedClass.endTime), 'HH:mm')}
                </div>
              </div>
              
              {selectedClass.isActive && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-800 font-medium">
                    🟢 Esta clase está activa. Los estudiantes pueden marcar su asistencia.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 