"use client"

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

import { useSession, signOut } from "next-auth/react"
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
  User
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Loading } from "@/components/ui/loading"

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

export default function TeacherPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== "TEACHER") {
      router.push("/login")
      return
    }

    fetchTeacherClasses()
  }, [session, status, router])

  const fetchTeacherClasses = async () => {
    try {
      if (!session?.user?.trainerId) {
        console.error("No trainer ID found for user")
        setIsLoading(false)
        return
      }
      
      const response = await fetch(`/api/teachers/${session.user.trainerId}/classes`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }
    } catch (error) {
      console.error("Error fetching teacher classes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    return days[dayOfWeek]
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5) // Remove seconds
  }

  const getActiveStudentsCount = (enrollments: any[]) => {
    return enrollments.filter(enrollment => enrollment.isActive).length
  }

  if (status === "loading" || isLoading) {
    return <Loading message="Cargando panel de profesor..." />
  }

  if (!session || session.user.role !== "TEACHER") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-12">
          {/* Header del Profesor */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/90 via-slate-800/90 to-gray-700/90 p-8 border border-gray-600 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-300/20 to-green-300/20"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-6">
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
                  <div className="flex items-center space-x-3 mb-2">
                    <GraduationCap className="h-6 w-6 text-blue-400" />
                    <h1 className="text-3xl font-bold text-white">Panel de Profesor</h1>
                  </div>
                  <p className="text-blue-300">Bienvenido, {session.user.name}</p>
                  <p className="text-gray-400 text-sm">
                    {session.user.trainerName && `Profesor: ${session.user.trainerName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-white font-semibold">{classes.length} Clases Asignadas</p>
                  <p className="text-blue-400 text-sm">
                    {classes.reduce((total, cls) => total + getActiveStudentsCount(cls.enrollments), 0)} Estudiantes Totales
                  </p>
                </div>
                <Button 
                  onClick={handleSignOut}
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/teacher/attendance">
              <Card className="group cursor-pointer border-0 bg-gray-800/90 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 border border-gray-600 hover:border-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold group-hover:text-blue-300 transition-colors">Tomar Asistencia</h3>
                      <p className="text-gray-400 text-sm">Registrar asistencia de estudiantes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/teacher/students">
              <Card className="group cursor-pointer border-0 bg-gray-800/90 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 border border-gray-600 hover:border-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold group-hover:text-green-300 transition-colors">Mis Estudiantes</h3>
                      <p className="text-gray-400 text-sm">Ver lista de estudiantes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/teacher/schedule">
              <Card className="group cursor-pointer border-0 bg-gray-800/90 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 border border-gray-600 hover:border-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold group-hover:text-purple-300 transition-colors">Mi Horario</h3>
                      <p className="text-gray-400 text-sm">Ver horarios de clases</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Mis Clases */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <BookOpen className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Mis Clases</h2>
              <Badge className="bg-blue-500 text-white">{classes.length}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((danceClass) => (
                <Card key={danceClass.id} className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600 hover:border-blue-500 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{danceClass.name}</CardTitle>
                      <Badge variant={danceClass.isActive ? "default" : "secondary"}>
                        {danceClass.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    {danceClass.description && (
                      <p className="text-gray-400 text-sm">{danceClass.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Estudiantes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        <span className="text-gray-300 text-sm">Estudiantes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">
                          {getActiveStudentsCount(danceClass.enrollments)}
                        </span>
                        <span className="text-gray-400">/ {danceClass.capacity}</span>
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300 text-sm">Horarios</span>
                      </div>
                      <div className="space-y-1">
                        {danceClass.schedules
                          .filter(schedule => schedule.isActive)
                          .map((schedule) => (
                            <div key={schedule.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">{getDayName(schedule.dayOfWeek)}</span>
                              <span className="text-white">
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Precio */}
                    {danceClass.price && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Precio</span>
                        <span className="text-green-400 font-semibold">${danceClass.price}</span>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex space-x-2 pt-4">
                      <Link href={`/teacher/classes/${danceClass.id}/attendance`} className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white text-sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Asistencia
                        </Button>
                      </Link>
                      <Link href={`/teacher/classes/${danceClass.id}/students`}>
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          <Users className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {classes.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No tienes clases asignadas</h3>
                  <p className="text-gray-400">Contacta al administrador para que te asigne clases</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 shadow-xl rounded-2xl border-2 border-gray-600">
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