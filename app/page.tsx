"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, MessageSquare, Clock, BarChart3, AlertTriangle, Sparkles, ArrowRight } from "lucide-react"
import { ReceiptSystem } from "@/components/receipt-system"
import { MassiveMessages } from "@/components/massive-messages"
import { AttendanceSystem } from "@/components/attendance-system"
import { AttendanceHistory } from "@/components/attendance-history"
import { DebtNotifications } from "@/components/debt-notifications"

export default function DanceAcademyApp() {
  const [activeSection, setActiveSection] = useState("home")
  const [pendingDebts, setPendingDebts] = useState(0)

  useEffect(() => {
    const checkDebts = async () => {
      const response = await fetch("/api/debts")
      const data = await response.json()
      setPendingDebts(data.count)
    }
    checkDebts()
  }, [])

  const menuItems = [
    {
      id: "receipts",
      label: "Recibos WhatsApp",
      icon: Receipt,
      description: "Envío automático de recibos",
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "messages",
      label: "Mensajes Masivos",
      icon: MessageSquare,
      description: "Comunicación grupal",
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "attendance",
      label: "Asistencia TikTok",
      icon: Clock,
      description: "Registro rápido visual",
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "history",
      label: "Historial Gráfico",
      icon: BarChart3,
      description: "Análisis de asistencias",
      color: "from-orange-500 to-red-600",
    },
    {
      id: "debts",
      label: "Notif. Deudas",
      icon: AlertTriangle,
      description: "Control de pagos",
      color: "from-red-500 to-pink-600",
    },
  ]

  const renderContent = () => {
    switch (activeSection) {
      case "receipts":
        return <ReceiptSystem />
      case "messages":
        return <MassiveMessages />
      case "attendance":
        return <AttendanceSystem />
      case "history":
        return <AttendanceHistory />
      case "debts":
        return <DebtNotifications />
      default:
        return (
          <div className="space-y-12">
            {/* Header Principal */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"></div>
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-xl"></div>
              </div>
              <div className="relative z-10">
                <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 shadow-2xl">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <h1 className="mb-4 text-5xl font-bold text-white">Academia de Bailes</h1>
                <p className="text-xl text-slate-300 mb-6">Sistema de Gestión Profesional</p>
                <div className="inline-flex items-center space-x-3 rounded-full bg-white/10 px-6 py-3 backdrop-blur-sm border border-white/20">
                  <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-white font-medium">Sistema Activo</span>
                </div>
              </div>
            </div>

            {/* Grid de Funcionalidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {menuItems.map((item, index) => (
                <Card
                  key={item.id}
                  className="group relative overflow-hidden border-0 bg-white shadow-2xl transition-all duration-700 hover:shadow-3xl hover:-translate-y-3 cursor-pointer rounded-2xl"
                  onClick={() => setActiveSection(item.id)}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-700`}
                  ></div>
                  <CardContent className="relative p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${item.color} shadow-xl group-hover:scale-110 transition-transform duration-500`}
                      >
                        <item.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <span className="text-sm font-bold text-slate-700">{index + 1}</span>
                        </div>
                        {item.id === "debts" && pendingDebts > 0 && (
                          <Badge className="bg-red-500 text-white shadow-lg animate-pulse">{pendingDebts}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">
                        {item.label}
                      </h3>
                      <p className="text-slate-600 text-lg leading-relaxed">{item.description}</p>
                    </div>
                    <div className="mt-6 flex items-center text-slate-500 group-hover:text-slate-700 transition-colors duration-300">
                      <span className="text-sm font-medium">Acceder</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer Info */}
            <Card className="border-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-xl rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="h-4 w-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse"></div>
                  <span className="text-2xl font-bold text-slate-800">Sistema Profesional</span>
                  <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-pulse"></div>
                </div>
                <p className="text-slate-600 text-lg">Gestiona tu academia con la máxima eficiencia y estilo</p>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-6 py-8">
        {activeSection !== "home" && (
          <div className="mb-10 flex items-center justify-between rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <Button
              variant="ghost"
              onClick={() => setActiveSection("home")}
              className="rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 px-6 py-3 font-medium transition-all duration-300"
            >
              ← Volver al Inicio
            </Button>
            <h2 className="text-2xl font-bold text-slate-800">
              {menuItems.find((item) => item.id === activeSection)?.label}
            </h2>
            <div className="w-32"></div>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  )
}
