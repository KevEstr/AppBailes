"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  ShoppingCart,
  UserRound,
  Phone,
  Cake,
  Save,
  X
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
  const [trainerProfile, setTrainerProfile] = useState<any>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    birthDate: "",
    email: "",
    password: "",
    passwordConfirm: "",
  })
  const [profileError, setProfileError] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar sesión
        const sessionResponse = await fetch("/api/auth/session")
        const session = await sessionResponse.json()
        setUserSession(session)

        // Cargar perfil del profesor
        if (session?.user?.role === "TEACHER") {
          const profileRes = await fetch("/api/teacher/profile")
          const profileData = await profileRes.json()
          if (profileData.success) {
            setTrainerProfile(profileData.trainer)
            const phone = (profileData.trainer.phone || "").replace(/^57/, "")
            setProfileForm({
              name: profileData.trainer.name || "",
              phone,
              birthDate: profileData.trainer.birthDate || "",
              email: profileData.trainer.user?.email || "",
              password: "",
              passwordConfirm: "",
            })
          }
        }

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

  const saveProfile = async () => {
    if (profileForm.password !== profileForm.passwordConfirm) {
      setProfileError("Las contraseñas no coinciden")
      return
    }
    if (profileForm.password && profileForm.password.length > 0 && profileForm.password.length < 6) {
      setProfileError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setSavingProfile(true)
    setProfileError("")
    try {
      const body: any = {
        name: profileForm.name,
        phone: profileForm.phone,
        birthDate: profileForm.birthDate || null,
        email: profileForm.email,
      }
      if (profileForm.password) {
        body.password = profileForm.password
      }

      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setTrainerProfile(data.trainer)
        const phone = (data.trainer.phone || "").replace(/^57/, "")
        setProfileForm({
          name: data.trainer.name || "",
          phone,
          birthDate: data.trainer.birthDate || "",
          email: data.trainer.user?.email || "",
          password: "",
          passwordConfirm: "",
        })
        setProfileModalOpen(false)
      } else {
        setProfileError(data.error || "Error al guardar")
      }
    } catch (e) {
      setProfileError("Error de conexión")
    } finally {
      setSavingProfile(false)
    }
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

          {/* Perfil del Profesor */}
          {trainerProfile && (
            <Card className="border-0 bg-gradient-to-r from-blue-800/90 to-blue-700/90 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center border-2 border-blue-400">
                      <UserRound className="h-7 w-7 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{trainerProfile.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-300 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {trainerProfile.phone?.replace(/^57/, "") || "—"}
                        </span>
                        {trainerProfile.user?.email && (
                          <span>{trainerProfile.user.email}</span>
                        )}
                        {trainerProfile.birthDate && (
                          <span className="flex items-center gap-1">
                            <Cake className="w-3 h-3 text-gray-400" />
                            {trainerProfile.birthDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const phone = (trainerProfile.phone || "").replace(/^57/, "")
                      setProfileForm({
                        name: trainerProfile.name || "",
                        phone,
                        birthDate: trainerProfile.birthDate || "",
                        email: trainerProfile.user?.email || "",
                        password: "",
                        passwordConfirm: "",
                      })
                      setProfileError("")
                      setProfileModalOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Editar Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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

      {/* Modal Editar Perfil */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <UserRound className="h-5 w-5 text-blue-400" />
              Editar Perfil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pName" className="text-white">Nombre Completo</Label>
              <Input
                id="pName"
                value={profileForm.name}
                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pPhone" className="text-white">Teléfono</Label>
              <Input
                id="pPhone"
                type="tel"
                value={profileForm.phone}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9]/g, "")
                  setProfileForm({...profileForm, phone: clean})
                }}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400">10 dígitos (ej: 3001234567)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pBirthDate" className="text-white">Fecha de Nacimiento</Label>
              <Input
                id="pBirthDate"
                type="date"
                value={profileForm.birthDate}
                onChange={(e) => setProfileForm({...profileForm, birthDate: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pEmail" className="text-white">Correo Electrónico</Label>
              <Input
                id="pEmail"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <hr className="border-gray-700 my-2" />

            <div className="space-y-2">
              <Label htmlFor="pPassword" className="text-white">Nueva Contraseña</Label>
              <Input
                id="pPassword"
                type="password"
                placeholder="Dejar vacío para mantener actual"
                value={profileForm.password}
                onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400">Mínimo 6 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pPasswordConfirm" className="text-white">Confirmar Contraseña</Label>
              <Input
                id="pPasswordConfirm"
                type="password"
                placeholder="Repite la nueva contraseña"
                value={profileForm.passwordConfirm}
                onChange={(e) => setProfileForm({...profileForm, passwordConfirm: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {profileError && (
              <p className="text-xs text-red-400">{profileError}</p>
            )}

            <div className="flex space-x-4 pt-2">
              <Button
                disabled={savingProfile}
                onClick={saveProfile}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
              >
                {savingProfile ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setProfileModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                disabled={savingProfile}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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