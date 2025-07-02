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
  MapPin,
  Dumbbell,
  Building,
  Home as HomeIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Trainer {
  id: number
  name: string
  email: string
}

interface Location {
  id: number
  name: string
  address?: string
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
  sport: 'DANCE' | 'VOLLEYBALL'
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  trainer: Trainer
  location?: Location
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

const SPORT_OPTIONS = [
  { value: 'DANCE', label: 'Baile Urbano', icon: GraduationCap, color: 'from-purple-500 to-pink-600' },
  { value: 'VOLLEYBALL', label: 'Voleibol', icon: Dumbbell, color: 'from-blue-500 to-green-600' }
]

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' }
]

export function ClassManagementNew() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [totalClasses, setTotalClasses] = useState(0)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [selectedClass, setSelectedClass] = useState<DanceClass | null>(null)
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)

  // Filtros
  const [filterSport, setFilterSport] = useState<string>('ALL')
  const [filterTrainer, setFilterTrainer] = useState<string>('ALL')
  const [filterLocation, setFilterLocation] = useState<string>('ALL')
  const [filterLevel, setFilterLevel] = useState<string>('ALL')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const CLASSES_PER_PAGE = 6

  // Formulario para nueva clase - memoizado
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    sport: 'DANCE' as 'DANCE' | 'VOLLEYBALL',
    level: 'BEGINNER' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    trainerId: 0,
    locationId: 0,
    capacity: 20,
    price: 0,
    schedules: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
  })

  // Formulario para nueva ubicación
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: ''
  })

  // Cargar trainers según deporte y filtros activos
  const loadTrainers = useCallback(async () => {
    let url = '/api/trainers?active=true'
    if (filterSport !== 'ALL') url += `&sport=${filterSport}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.success) setTrainers(data.trainers)
  }, [filterSport])

  // Cargar ubicaciones
  const loadLocations = useCallback(async () => {
    const res = await fetch('/api/enrollment/locations?sport=VOLLEYBALL')
    const data = await res.json()
    if (data.success) setLocations(data.locations)
  }, [])

  // Cargar clases paginadas y filtradas
  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('active', 'true')
      params.set('page', currentPage.toString())
      params.set('pageSize', CLASSES_PER_PAGE.toString())
      if (filterSport !== 'ALL') params.set('sport', filterSport)
      if (filterTrainer !== 'ALL') params.set('trainerId', filterTrainer)
      if (filterLocation !== 'ALL') params.set('locationId', filterLocation)
      if (filterLevel !== 'ALL') params.set('level', filterLevel)
      const res = await fetch(`/api/classes?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setClasses(data.classes)
        setTotalClasses(data.total)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterSport, filterTrainer, filterLocation, filterLevel])

  // Efectos para cargar datos
  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  useEffect(() => {
    loadTrainers()
  }, [loadTrainers])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSport, filterTrainer, filterLocation, filterLevel])

  // ✅ Crear nueva ubicación
  const createLocation = useCallback(async () => {
    if (!newLocation.name) {
      toast({
        title: "❌ Error",
        description: "El nombre de la ubicación es requerido",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Ubicación creada",
          description: `${newLocation.name} ha sido creada exitosamente`
        })
        setShowLocationDialog(false)
        
        // Agregar la nueva ubicación a la lista
        setLocations(prev => [...prev, data.location])
        
        // Reset form
        setNewLocation({ name: '', address: '' })
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo crear la ubicación",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al crear la ubicación",
        variant: "destructive"
      })
    }
  }, [newLocation, toast])

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

    if (newClass.sport === 'VOLLEYBALL' && !newClass.locationId) {
      toast({
        title: "❌ Error",
        description: "La ubicación es requerida para clases de voleibol",
        variant: "destructive"
      })
      return
    }

    try {
      const classData = {
        ...newClass,
        trainerId: Number(newClass.trainerId),
        locationId: newClass.sport === 'VOLLEYBALL' ? Number(newClass.locationId) : undefined
      }

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Clase creada",
          description: `${newClass.name} ha sido creada exitosamente`
        })
        setShowCreateDialog(false)
        
        // ✅ OPTIMIZACIÓN: Solo agregar la nueva clase sin recargar
        const newClassWithDetails = {
          ...data.class,
          trainer: trainers.find(t => t.id === Number(newClass.trainerId))!,
          location: newClass.locationId ? locations.find(l => l.id === Number(newClass.locationId)) : undefined,
          enrollments: [],
          _count: { enrollments: 0 }
        }
        setClasses(prev => [...prev, newClassWithDetails])
        
        // Reset form
        setNewClass({
          name: '',
          description: '',
          sport: 'DANCE',
          level: 'BEGINNER',
          trainerId: 0,
          locationId: 0,
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
  }, [newClass, trainers, locations, toast])

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
        description: "Error al inscribir al estudiante",
        variant: "destructive"
      })
    }
  }, [students, toast])

  // ✅ OPTIMIZACIÓN: deleteClass sin recargar todo
  const deleteClass = useCallback(async (classId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta clase?')) return

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Clase eliminada",
          description: "La clase ha sido eliminada exitosamente"
        })
        
        // ✅ OPTIMIZACIÓN: Solo remover la clase específica
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

  // Funciones auxiliares para horarios
  const addSchedule = () => {
    setNewClass({
      ...newClass,
      schedules: [...newClass.schedules, { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }]
    })
  }

  const removeSchedule = (index: number) => {
    if (newClass.schedules.length > 1) {
      setNewClass({
        ...newClass,
        schedules: newClass.schedules.filter((_, i) => i !== index)
      })
    }
  }

  const updateSchedule = (index: number, field: keyof ClassSchedule, value: any) => {
    const updated = newClass.schedules.map((schedule, i) => 
        i === index ? { ...schedule, [field]: value } : schedule
      )
    setNewClass({ ...newClass, schedules: updated })
  }

  // ✅ OPTIMIZACIÓN: Memorizar clases filtradas
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (filterSport !== 'ALL' && cls.sport !== filterSport) return false
      if (filterTrainer !== 'ALL' && cls.trainer.id.toString() !== filterTrainer) return false
      if (filterLocation !== 'ALL' && cls.location && cls.location.id.toString() !== filterLocation) return false
      if (filterLevel !== 'ALL' && cls.level !== filterLevel) return false
      return true
    })
  }, [classes, filterSport, filterTrainer, filterLocation, filterLevel])

  // Paginación de clases filtradas
  const totalPages = Math.ceil(totalClasses / CLASSES_PER_PAGE)
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * CLASSES_PER_PAGE
    return filteredClasses.slice(start, start + CLASSES_PER_PAGE)
  }, [filteredClasses, currentPage])

  // ✅ OPTIMIZACIÓN: Memorizar estudiantes disponibles para inscripción
  const availableStudents = useMemo(() => {
    if (!selectedClass) return []
    const enrolledIds = selectedClass.enrollments.map(e => e.student.id)
    return students.filter(student => !enrolledIds.includes(student.id))
  }, [students, selectedClass])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto px-2 sm:px-4 md:px-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <Button variant="link" className="text-blue-400 hover:text-blue-300 p-0">
            <HomeIcon className="h-4 w-4 mr-1" />
            Inicio
          </Button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-300">Clases</span>
        </div>
      </div>

      {/* Título y descripción */}
      <div className="flex items-start space-x-4 mb-6">
              <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Gestión de Clases
          </h1>
          <p className="text-gray-300 mt-1">
            Sistema de administración de clases y horarios
          </p>
        </div>
              </div>

      {/* Card de Filtros */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-6 sm:mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Deporte</Label>
              <Select value={filterSport} onValueChange={setFilterSport}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="DANCE">Baile</SelectItem>
                  <SelectItem value="VOLLEYBALL">Voleibol</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Instructor/Entrenador</Label>
              <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
                  </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Nivel</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Ubicación</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todas" />
                              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

            {/* Botón Nueva Clase */}
            <div className="flex-1 min-w-[140px] sm:max-w-[220px]">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                            <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="w-full sm:w-auto bg-blue-600/60 hover:bg-blue-700/60 border border-blue-500 text-white text-lg px-6 py-3 rounded-2xl hover:text-white backdrop-blur-sm"
                  >
                    <Plus className="w-6 h-6 mr-2 text-white" />
                    Nueva Clase
                            </Button>
                </DialogTrigger>
                <DialogContent className="!w-[95vw] !max-w-5xl h-[90vh] max-h-[90vh] overflow-y-auto bg-gray-800 border border-gray-600 text-white !left-[50%] !translate-x-[-50%]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">
                      Crear Nueva Clase de {newClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                    </DialogTitle>
                  </DialogHeader>
                  {/* Rest of the dialog content */}
                </DialogContent>
              </Dialog>
                          </div>
                        </div>
        </CardContent>
      </Card>

      {/* Lista de clases paginada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-3 flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-3 text-center text-gray-400 py-12">No hay clases para mostrar.</div>
        ) : (
          classes.map((danceClass) => (
            <Card key={danceClass.id} className="border-0 shadow-2xl rounded-2xl sm:rounded-3xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-8">
              {/* Header de la clase */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                      <Badge className={`$ {
                        danceClass.sport === 'DANCE' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-blue-600 text-white'
                      } border-0 text-xs sm:text-sm`}>
                        {danceClass.sport === 'DANCE' ? '💃 Baile' : '🏐 Voleibol'}
                      </Badge>
                      {danceClass.level && (
                        <Badge variant="outline" className="text-gray-300 border-gray-600 text-xs sm:text-sm">
                          {danceClass.level === 'BEGINNER' ? 'Principiante' :
                            danceClass.level === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">{danceClass.name}</h3>
                    <p className="text-gray-300 mb-2 text-sm sm:text-base truncate">{danceClass.description || "Sin descripción"}</p>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4" />
                        <span className="truncate">{danceClass.trainer.name}</span>
                      </div>
                      {danceClass.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{danceClass.location.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 sm:gap-0 items-center sm:items-end mt-2 sm:mt-0">
                  <Button variant="outline" size="sm" onClick={() => deleteClass(danceClass.id)} className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>

                {/* Estadísticas y horarios */}
                <div className="space-y-2 sm:space-y-4">
                  <div className="flex justify-between items-center p-2 sm:p-4 bg-gray-700/50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      <span className="text-white font-medium text-xs sm:text-base">Estudiantes</span>
                    </div>
                    <span className="text-lg sm:text-2xl font-bold text-blue-400">
                      {danceClass._count.enrollments}/{danceClass.capacity}
                    </span>
                  </div>

                  <div className="p-2 sm:p-4 bg-gray-700/50 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                      <Calendar className="h-4 w-4 text-green-400" />
                      <span className="text-xs sm:text-sm font-medium text-gray-300">Horarios</span>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                  {danceClass.schedules.map((schedule, index) => (
                        <div key={index} className="flex justify-between items-center p-1 sm:p-2 bg-gray-600/50 rounded text-xs">
                          <span className="font-medium text-white">{DAYS_OF_WEEK[schedule.dayOfWeek]}</span>
                          <span className="text-green-300 font-mono">{schedule.startTime} - {schedule.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>

                  <Button
                    onClick={() => {
                      setSelectedClass(danceClass)
                      setShowEnrollDialog(true)
                    }}
                    disabled={danceClass._count.enrollments >= danceClass.capacity}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inscribir Estudiante
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
              </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 sm:mt-8">
          <Button
            variant="outline"
            className="border-gray-600 text-white"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-gray-300 text-sm sm:text-base">Página {currentPage} de {totalPages}</span>
                      <Button 
                        variant="outline" 
            className="border-gray-600 text-white"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
                      </Button>
        </div>
      )}

      {/* Dialog para inscribir estudiante */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-2xl bg-gray-800 border border-gray-600 text-white">
                      <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Inscribir Estudiante en {selectedClass?.name}
            </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {availableStudents.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No hay estudiantes disponibles para inscribir en esta clase.
              </p>
            ) : (
              <>
                <p className="text-gray-300">
                  Selecciona un estudiante para inscribir en esta clase:
                </p>
                <div className="max-h-80 overflow-y-auto space-y-2">
                            {availableStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                                <div>
                          <p className="font-medium text-white">{student.name}</p>
                          <p className="text-sm text-gray-400">ID: {student.id}</p>
                          <p className="text-sm text-gray-400">{student.email}</p>
                        </div>
                                </div>
                                <Button 
                        onClick={() => selectedClass && enrollStudent(student.id, selectedClass.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Inscribir
                                </Button>
                              </div>
                            ))}
                          </div>
              </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
    </div>
  )
} 