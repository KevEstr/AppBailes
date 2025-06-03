"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock, Plus, Trash2 } from "lucide-react"

const DAYS_OF_WEEK = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
]

interface Schedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  hasPeriod: boolean
  startDate?: string
  endDate?: string
}

interface Trainer {
  id: number
  name: string
  email: string
}

export function ClassCreationEnhanced() {
  const [classData, setClassData] = useState({
    name: '',
    description: '',
    trainerId: 0,
    capacity: 20,
    price: 0
  })

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(false)

  const [schedules, setSchedules] = useState<Schedule[]>([
    { 
      dayOfWeek: 1, 
      startTime: '18:00', 
      endTime: '19:00', 
      hasPeriod: false 
    }
  ])

  // Cargar entrenadores al montar el componente
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const response = await fetch('/api/trainers?active=true')
        const data = await response.json()
        if (data.success) {
          setTrainers(data.trainers)
        }
      } catch (error) {
        console.error('Error loading trainers:', error)
      }
    }
    fetchTrainers()
  }, [])

  const addSchedule = () => {
    setSchedules([...schedules, { 
      dayOfWeek: 1, 
      startTime: '18:00', 
      endTime: '19:00', 
      hasPeriod: false 
    }])
  }

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const updateSchedule = (index: number, field: keyof Schedule, value: any) => {
    const newSchedules = [...schedules]
    newSchedules[index] = { ...newSchedules[index], [field]: value }
    setSchedules(newSchedules)
  }

  const createClass = async () => {
    if (!classData.name || !classData.trainerId) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...classData,
          trainerId: Number(classData.trainerId), // Asegurar que sea número
          schedules: schedules.map(schedule => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            ...(schedule.hasPeriod && {
              startDate: schedule.startDate,
              endDate: schedule.endDate
            })
          }))
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('¡Clase creada exitosamente!')
        // Reset form
        setClassData({
          name: '',
          description: '',
          trainerId: 0,
          capacity: 20,
          price: 0
        })
        setSchedules([{ 
          dayOfWeek: 1, 
          startTime: '18:00', 
          endTime: '19:00', 
          hasPeriod: false 
        }])
      } else {
        alert(`Error al crear la clase: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating class:', error)
      alert('Error al crear la clase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-6 w-6" />
          <span>Crear Clase con Períodos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nombre de la Clase *</Label>
            <Input
              id="name"
              value={classData.name}
              onChange={(e) => setClassData({...classData, name: e.target.value})}
              placeholder="ej: Salsa de Verano"
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacidad</Label>
            <Input
              id="capacity"
              type="number"
              value={classData.capacity}
              onChange={(e) => setClassData({...classData, capacity: parseInt(e.target.value) || 20})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="trainer">Entrenador *</Label>
            <Select 
              value={classData.trainerId.toString()} 
              onValueChange={(value) => setClassData({...classData, trainerId: parseInt(value)})}
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
              value={classData.price}
              onChange={(e) => setClassData({...classData, price: parseFloat(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={classData.description}
            onChange={(e) => setClassData({...classData, description: e.target.value})}
            placeholder="Descripción de la clase..."
          />
        </div>

        {/* Horarios con períodos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-semibold">Horarios y Períodos</Label>
            <Button onClick={addSchedule} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Horario
            </Button>
          </div>

          {schedules.map((schedule, index) => (
            <Card key={index} className="mb-4 p-4">
              <div className="space-y-4">
                {/* Día y horarios */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
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
                  <div className="col-span-2">
                    <Button 
                      onClick={() => removeSchedule(index)} 
                      variant="destructive" 
                      size="sm"
                      disabled={schedules.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Checkbox para período */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`period-${index}`}
                    checked={schedule.hasPeriod}
                    onCheckedChange={(checked) => updateSchedule(index, 'hasPeriod', checked)}
                  />
                  <Label htmlFor={`period-${index}`} className="text-sm font-medium">
                    🗓️ Definir período específico (fecha inicio y fin)
                  </Label>
                </div>

                {/* Fechas de período */}
                {schedule.hasPeriod && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div>
                      <Label>📅 Fecha de inicio</Label>
                      <Input
                        type="date"
                        value={schedule.startDate || ''}
                        onChange={(e) => updateSchedule(index, 'startDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>📅 Fecha de fin</Label>
                      <Input
                        type="date"
                        value={schedule.endDate || ''}
                        onChange={(e) => updateSchedule(index, 'endDate', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                        <strong>Ejemplo:</strong> Si seleccionas "Lunes" del 01/01/2025 al 31/03/2025, 
                        se generarán sesiones solo los lunes dentro de ese período.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Vista previa */}
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg">📋 Vista Previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{DAYS_OF_WEEK[schedule.dayOfWeek]}</span>
                    <span>{schedule.startTime} - {schedule.endTime}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {schedule.hasPeriod 
                      ? `📅 ${schedule.startDate} → ${schedule.endDate}`
                      : '🔄 Permanente'
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botón crear */}
        <div className="flex justify-end">
          <Button 
            onClick={createClass} 
            className="px-8" 
            disabled={!classData.name || !classData.trainerId || loading}
          >
            {loading ? 'Creando...' : 'Crear Clase con Períodos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 