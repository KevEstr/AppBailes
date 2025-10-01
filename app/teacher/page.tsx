"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  GraduationCap, 
  Clock, 
  Users, 
  Calendar,
  LogOut,
  BookOpen,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  ShoppingCart
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Loading } from "@/components/ui/loading"
import { AuthGuard } from "@/components/auth-guard"

interface DanceClass {
  id: number
  name: string
  description?: string
  capacity: number
  price?: number
  isActive: boolean
  enrollments: {
    id: number
    student: {
      id: number
      name: string
      email?: string
      phone: string
    }
    isActive: boolean
  }[]
  schedules: {
    id: number
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }[]
}

function TeacherContent() {
  const router = useRouter()
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar sesión
        const sessionResponse = await fetch("/api/auth/session")
        const session = await sessionResponse.json()
        setUserSession(session)

        // Cargar clases del profesor
        if (session?.user?.trainerId) {
          await fetchTeacherClasses(session.user.trainerId)
        }
      } catch (error) {
        console.error("Error loading teacher data:", error)
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const fetchTeacherClasses = async (trainerId: number) => {
    try {
      if (!trainerId) {
        console.error("No trainer ID found for user")
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/teachers/${trainerId}/classes`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setClasses(data.classes || [])
      } else {
        console.error("Failed to fetch classes:", data.error)
        setClasses([])
      }
    } catch (error) {
      console.error("Error fetching teacher classes:", error)
      setClasses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const getDayName = (dayNumber: number) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    return days[dayNumber] || "Día desconocido"
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  const getActiveEnrollments = (enrollments: any[]) => {
    return enrollments.filter(enrollment => enrollment.isActive)
  }

  if (isLoading) {
    return <Loading />
  }

  if (!userSession || userSession.user?.role !== "TEACHER") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Verificando permisos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="space-y-8">
          {/* Header del Profesor */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/90 via-slate-800/90 to-gray-700/90 p-6 sm:p-8 border border-gray-600 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-300/20 to-green-300/20"></div>
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 shadow-2xl border-4 border-blue-500 relative overflow-hidden">
                  <Image
                    src="/logo.jpg"
                    alt="Paradise Dance Academy Logo"
                    width={60}
                    height={60}
                    className="object-contain"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 opacity-20"></div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Panel de Profesor</h1>
                  <p className="text-blue-300">Bienvenido, {userSession.user?.name}</p>
                  <p className="text-blue-200 text-sm">
                    {userSession.user?.trainerName && `Profesor: ${userSession.user.trainerName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleSignOut}
                  size="sm"
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Salir
                </Button>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 bg-gradient-to-r from-blue-800/90 to-blue-700/90 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Total de Clases</p>
                    <p className="text-2xl font-bold text-white">{classes.length}</p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-r from-green-800/90 to-green-700/90 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Estudiantes Activos</p>
                    <p className="text-2xl font-bold text-white">
                      {classes.reduce((total, cls) => total + getActiveEnrollments(cls.enrollments).length, 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-r from-purple-800/90 to-purple-700/90 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Clases Activas</p>
                    <p className="text-2xl font-bold text-white">
                      {classes.filter(cls => cls.isActive).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Clases */}
          <Card className="border-0 bg-gray-800/90 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Mis Clases
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {classes.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No tienes clases asignadas</p>
                  <p className="text-gray-500">Contacta al administrador para asignar clases</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {classes.map((danceClass) => (
                    <Card key={danceClass.id} className="border border-gray-600 bg-gray-700/50 hover:bg-gray-600/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">{danceClass.name}</h3>
                            {danceClass.description && (
                              <p className="text-gray-400 text-sm">{danceClass.description}</p>
                            )}
                          </div>
                          <Badge 
                            variant={danceClass.isActive ? "default" : "secondary"}
                            className={danceClass.isActive ? "bg-green-600" : "bg-gray-600"}
                          >
                            {danceClass.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>

                        {/* Horarios */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-300 mb-2">Horarios:</p>
                          {danceClass.schedules.filter(schedule => schedule.isActive).length === 0 ? (
                            <p className="text-gray-500 text-sm">Sin horarios asignados</p>
                          ) : (
                            <div className="space-y-1">
                              {danceClass.schedules
                                .filter(schedule => schedule.isActive)
                                .map((schedule) => (
                                  <div key={schedule.id} className="flex items-center gap-2 text-sm text-gray-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>{getDayName(schedule.dayOfWeek)}</span>
                                    <Clock className="h-3 w-3 ml-2" />
                                    <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Estudiantes */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-300">Estudiantes:</p>
                            <Badge variant="outline" className="border-gray-500 text-gray-300">
                              {getActiveEnrollments(danceClass.enrollments).length}/{danceClass.capacity}
                            </Badge>
                          </div>
                          
                          {getActiveEnrollments(danceClass.enrollments).length === 0 ? (
                            <p className="text-gray-500 text-sm">Sin estudiantes inscritos</p>
                          ) : (
                            <div className="space-y-1">
                              {getActiveEnrollments(danceClass.enrollments).slice(0, 3).map((enrollment) => (
                                <div key={enrollment.id} className="flex items-center gap-2 text-sm text-gray-400">
                                  <User className="h-3 w-3" />
                                  <span>{enrollment.student.name}</span>
                                </div>
                              ))}
                              {getActiveEnrollments(danceClass.enrollments).length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{getActiveEnrollments(danceClass.enrollments).length - 3} más...
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2 mt-4">
                          <Link href={`/attendance?classId=${danceClass.id}`} className="flex-1">
                            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                              <Clock className="h-4 w-4 mr-1" />
                              Asistencia
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del Sistema */}
          <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-600 to-green-600 animate-pulse shadow-lg shadow-blue-500/50"></div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                  Panel de Profesor Activo
                </span>
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-green-600 to-blue-600 animate-pulse shadow-lg shadow-green-500/50"></div>
              </div>
              <p className="text-gray-400">Gestiona tus clases y estudiantes de Paradise Dance Academy</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function TeacherPage() {
  return (
    <AuthGuard requiredRole="TEACHER">
      <TeacherContent />
    </AuthGuard>
  )
}