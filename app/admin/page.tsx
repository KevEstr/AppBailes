"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  GraduationCap, 
  Clock, 
  Receipt, 
  MessageSquare, 
  BarChart3, 
  AlertTriangle, 
  CreditCard,
  Settings,
  LogOut,
  Shield,
  UserPlus,
  UserCheck,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Loading } from "@/components/ui/loading"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pendingDebts, setPendingDebts] = useState(0)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== "ADMIN") {
      router.push("/login")
      return
    }

    // Cargar datos de deudas pendientes
    const fetchDebts = async () => {
      try {
        const response = await fetch("/api/debts")
        const data = await response.json()
        setPendingDebts(data.count || 0)
      } catch (error) {
        console.error("Error fetching debts:", error)
      }
    }

    fetchDebts()
  }, [session, status, router])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  if (status === "loading") {
    return <Loading message="Cargando panel de administrador..." />
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  const adminMenuItems = [
    {
      id: "users",
      href: "/admin/users",
      label: "Gestión de Usuarios",
      icon: Users,
      description: "Administrar usuarios y roles del sistema",
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "classes",
      href: "/classes",
      label: "Gestión de Clases",
      icon: GraduationCap,
      description: "Organizar horarios y grupos de baile",
      color: "from-violet-500 to-purple-600",
    },
    {
      id: "students",
      href: "/admin/students",
      label: "Gestión de Estudiantes",
      icon: UserCheck,
      description: "Administrar estudiantes e inscripciones",
      color: "from-blue-500 to-cyan-600",
    },
    {
      id: "attendance",
      href: "/attendance",
      label: "Asistencia de Estudiantes",
      icon: Clock,
      description: "Control visual de asistencias",
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "receipts",
      href: "/receipts",
      label: "Recibos",
      icon: Receipt,
      description: "Recibos digitales automáticos",
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "messages",
      href: "/messages",
      label: "Notificaciones",
      icon: MessageSquare,
      description: "Comunicación con estudiantes",
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "history",
      href: "/history",
      label: "Análisis",
      icon: BarChart3,
      description: "Reportes de asistencia",
      color: "from-orange-500 to-red-600",
    },
    {
      id: "debts", 
      href: "/debts",
      label: "Control Pagos",
      icon: AlertTriangle,
      description: "Seguimiento de mensualidades",
      color: "from-red-500 to-pink-600",
    },
    {
      id: "monthly-payments",
      href: "/admin/monthly-payments",
      label: "Sistema de Mensualidades",
      icon: CreditCard,
      description: "Gestión moderna de pagos mensuales",
      color: "from-emerald-500 to-green-600",
    },
    {
      id: "financial-reports",
      href: "/admin/financial-reports",
      label: "Consolidado Financiero",
      icon: BarChart3,
      description: "Reportes y análisis de ingresos",
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "services",
      href: "/admin/services",
      label: "Servicios Adicionales",
      icon: Settings,
      description: "Gestión de servicios y tarifas",
      color: "from-indigo-500 to-purple-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-12">
          {/* Header del Admin */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/90 via-slate-800/90 to-gray-700/90 p-8 border border-gray-600 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-300/20 to-pink-300/20"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 shadow-2xl border-4 border-purple-500 relative overflow-hidden">
                  <Image
                    src="/logo.jpg"
                    alt="Paradise Dance Academy Logo"
                    width={60}
                    height={60}
                    className="object-contain"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-20"></div>
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Shield className="h-6 w-6 text-purple-400" />
                    <h1 className="text-3xl font-bold text-white">Panel de Administrador</h1>
                  </div>
                  <p className="text-purple-300">Bienvenido, {session.user.name}</p>
                  <p className="text-gray-400 text-sm">Acceso completo al sistema Paradise Dance Academy</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/admin/users">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Gestionar Usuarios
                  </Button>
                </Link>
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

          {/* Grid de Funcionalidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {adminMenuItems.map((item, index) => (
              <Link key={item.id} href={item.href} className="block">
                <Card className="group relative overflow-hidden border-0 bg-gray-800/90 shadow-2xl transition-all duration-700 hover:shadow-3xl hover:-translate-y-3 cursor-pointer rounded-2xl border border-gray-600 hover:border-purple-500 backdrop-blur-sm h-full">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-700`}
                  ></div>
                  <CardContent className="relative p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${item.color} shadow-xl group-hover:scale-110 transition-transform duration-500`}
                      >
                        <item.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 border border-purple-500">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>
                        {item.id === "debts" && pendingDebts > 0 && (
                          <Badge className="bg-red-500 text-white shadow-lg animate-pulse">{pendingDebts}</Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
                      {item.label}
                    </h3>
                    <p className="text-gray-400 mt-3 group-hover:text-gray-300 transition-colors duration-300">
                      {item.description}
                    </p>
                    <div className="mt-6 flex items-center text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
                      <span className="text-sm font-medium">Acceder</span>
                      <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Información del Sistema */}
          <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 shadow-xl rounded-2xl border-2 border-gray-600">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 animate-pulse shadow-lg shadow-purple-500/50"></div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Sistema de Administración Activo</span>
                  </div>
                  <p className="text-gray-400 text-lg">Control total sobre Paradise Dance Academy</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings className="h-8 w-8 text-purple-400" />
                  <span className="text-purple-400 font-semibold">Admin Panel</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 