"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, MessageSquare, Clock, BarChart3, AlertTriangle, Sparkles, ArrowRight, GraduationCap, CreditCard } from "lucide-react"

// ✅ OPTIMIZACIÓN: Cache para evitar llamadas duplicadas
let debtsCache: { count: number; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export default function HomePage() {
  const [pendingDebts, setPendingDebts] = useState(0)

  // ✅ OPTIMIZACIÓN: useCallback para checkDebts con cache
  const checkDebts = useCallback(async () => {
    const now = Date.now()
    
    // ✅ Verificar cache primero
    if (debtsCache && (now - debtsCache.timestamp) < CACHE_DURATION) {
      setPendingDebts(debtsCache.count)
      return // No hacer API call si hay cache válido
    }

    try {
      const response = await fetch("/api/debts")
      const data = await response.json()
      
      // ✅ Actualizar cache
      const count = data.count || 0
      debtsCache = { count, timestamp: now }
      setPendingDebts(count)
    } catch (error) {
      console.error("Error fetching debts:", error)
    }
  }, [])

  useEffect(() => {
    checkDebts()
  }, [checkDebts])

  // ✅ OPTIMIZACIÓN: Memoizar menuItems para evitar recreación
  const menuItems = useMemo(() => [
    {
      id: "classes",
      href: "/classes",
      label: "Gestión de Clases",
      icon: GraduationCap,
      description: "Organiza horarios y grupos de baile",
      color: "from-violet-500 to-purple-600",
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
  ], [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-12">
          {/* Header Principal */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/90 via-slate-800/90 to-gray-700/90 p-12 text-center border border-gray-600 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-300/20 to-purple-300/20"></div>
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-xl"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-purple-400/30 to-blue-400/30 rounded-full blur-xl"></div>
            </div>
            <div className="relative z-10">
              {/* Logo Paradise Dance Academy */}
              <div className="mb-8 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gray-700 shadow-2xl border-4 border-blue-500 relative overflow-hidden">
                <Image
                  src="/logo.jpg"
                  alt="Paradise Dance Academy Logo"
                  width={120}
                  height={120}
                  className="object-contain"
                  priority
                />
                {/* Fallback si no hay logo */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-20"></div>
              </div>
              <h1 className="mb-4 text-5xl font-bold text-white">Paradise Dance Academy</h1>
              <p className="text-xl text-blue-300 mb-6">Tu pasión por el baile, nuestro compromiso con la excelencia</p>
              <div className="inline-flex items-center space-x-3 rounded-full bg-gray-700/80 px-6 py-3 backdrop-blur-sm border border-blue-500 shadow-lg">
                <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></div>
                <span className="text-white font-medium">Sistema Paradise Activo</span>
              </div>
            </div>
          </div>

          {/* Grid de Funcionalidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {menuItems.map((item, index) => (
              <Link key={item.id} href={item.href} className="block">
                <Card className="group relative overflow-hidden border-0 bg-gray-800/90 shadow-2xl transition-all duration-700 hover:shadow-3xl hover:-translate-y-3 cursor-pointer rounded-2xl border border-gray-600 hover:border-blue-500 backdrop-blur-sm h-full">
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
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 border border-blue-500">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>
                        {item.id === "debts" && pendingDebts > 0 && (
                          <Badge className="bg-red-500 text-white shadow-lg animate-pulse">{pendingDebts}</Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">
                      {item.label}
                    </h3>
                    <p className="text-gray-400 mt-3 group-hover:text-gray-300 transition-colors duration-300">
                      {item.description}
                    </p>
                    <div className="mt-6 flex items-center text-blue-400 group-hover:text-blue-300 transition-colors duration-300">
                      <span className="text-sm font-medium">Acceder</span>
                      <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Footer Info */}
          <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 shadow-xl rounded-2xl border-2 border-gray-600">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 animate-pulse shadow-lg shadow-blue-500/50"></div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Paradise Dance Academy</span>
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 animate-pulse shadow-lg shadow-purple-500/50"></div>
              </div>
              <p className="text-gray-400 text-lg">Donde cada paso cuenta y cada sueño se hace realidad</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
