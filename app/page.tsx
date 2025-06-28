"use client"

<<<<<<< HEAD
import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, MessageSquare, Clock, BarChart3, AlertTriangle, Sparkles, ArrowRight, GraduationCap, UserPlus, Users } from "lucide-react"

// ✅ OPTIMIZACIÓN: Cache para evitar llamadas duplicadas
let debtsCache: { count: number; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
=======
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ParadiseSkeleton } from "@/components/ui/paradise-skeleton"
>>>>>>> 6bf72533bcfd0c5fa5ed44976996b17633962b0f

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
<<<<<<< HEAD
    checkDebts()
  }, [checkDebts])

  // ✅ OPTIMIZACIÓN: Memoizar menuItems para evitar recreación
  const menuItems = useMemo(() => [
    {
      id: "students",
      href: "/students",
      label: "Gestión de Estudiantes",
      icon: Users,
      description: "Administrar e inscribir estudiantes",
      color: "from-cyan-500 to-blue-600",
    },
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
  ], [])
=======
    // ⚡ Si no hay sesión, el middleware ya redirige al login
    // ⚡ Si hay sesión, redirigir según el rol
    if (status === "authenticated" && session?.user?.role) {
      const redirectUrl = session.user.role === "ADMIN" ? "/admin" : "/teacher"
      router.replace(redirectUrl)
    }
  }, [session, status, router])
>>>>>>> 6bf72533bcfd0c5fa5ed44976996b17633962b0f

  // ⚡ Mostrar loading mientras se procesa la redirección
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gray-700 shadow-2xl border-4 border-blue-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 animate-pulse"></div>
          <div className="text-3xl font-bold text-white">P</div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">Paradise Dance Academy</h1>
          <p className="text-blue-300">Redirigiendo al sistema...</p>
        </div>
        
        <ParadiseSkeleton />
      </div>
    </div>
  )
}
