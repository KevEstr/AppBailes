"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DollarSign, MessageSquare, Calendar, Send, Bell } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DebtInfo {
  id: number
  studentName: string
  avatar: string
  phone: string
  amount: number
  concept: string
  daysOverdue: number
  lastPayment: string
}

export function DebtNotifications() {
  const { toast } = useToast()
  const [debts, setDebts] = useState<DebtInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDebts()
  }, [])

  const loadDebts = async () => {
    try {
      const response = await fetch("/api/debts")
      const data = await response.json()
      setDebts(data.debts)
    } catch (error) {
      console.error("Error loading debts:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendDebtReminder = async (debtId: number) => {
    try {
      const response = await fetch("/api/debt-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtId }),
      })

      const result = await response.json()

      if (result.success) {
        const debt = debts.find((d) => d.id === debtId)
        toast({
          title: "✅ Recordatorio Enviado",
          description: `WhatsApp enviado a ${debt?.studentName}`,
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo enviar",
        variant: "destructive",
      })
    }
  }

  const sendMassiveReminders = async () => {
    try {
      const response = await fetch("/api/massive-debt-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Recordatorios Enviados",
          description: `${result.count} mensajes enviados`,
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error en envío masivo",
        variant: "destructive",
      })
    }
  }

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue >= 30) return "border-red-500 bg-gradient-to-r from-red-50 to-pink-50"
    if (daysOverdue >= 15) return "border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50"
    if (daysOverdue >= 7) return "border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50"
    return "border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50"
  }

  const getUrgencyBadge = (daysOverdue: number) => {
    if (daysOverdue >= 30) return { variant: "destructive" as const, label: "Crítico" }
    if (daysOverdue >= 15) return { variant: "destructive" as const, label: "Urgente" }
    if (daysOverdue >= 7) return { variant: "secondary" as const, label: "Atención" }
    return { variant: "default" as const, label: "Reciente" }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse border-0 shadow-xl rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-red-600 via-pink-600 to-red-700 text-white shadow-2xl mb-8 rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                <Bell className="h-8 w-8" />
              </div>
              <div>
                <span className="text-3xl font-bold">Notificaciones de Deuda</span>
                <p className="text-red-200 mt-2 text-lg">Control de pagos pendientes</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-2">
              {debts.length} pendientes
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Botón de envío masivo */}
      {debts.length > 0 && (
        <Card className="border-0 shadow-2xl mb-8 rounded-3xl">
          <CardContent className="p-6">
            <Button
              onClick={sendMassiveReminders}
              className="w-full h-16 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-2xl rounded-2xl text-xl font-bold transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1"
            >
              <Send className="w-6 h-6 mr-4" />
              Enviar Recordatorios Masivos ({debts.length})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de deudas */}
      <div className="space-y-6">
        {debts.length === 0 ? (
          <Card className="border-0 shadow-2xl rounded-3xl">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-4">¡Excelente!</h3>
              <p className="text-slate-600 text-xl">No hay deudas pendientes</p>
              <p className="text-lg text-slate-500 mt-3">Todos los estudiantes están al día</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {debts.map((debt) => {
              const urgency = getUrgencyBadge(debt.daysOverdue)
              return (
                <Card
                  key={debt.id}
                  className={`border-0 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:-translate-y-1 rounded-3xl ${getUrgencyColor(debt.daysOverdue)}`}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <Avatar className="w-16 h-16 ring-4 ring-white shadow-xl">
                          <AvatarImage src={debt.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-lg">
                            {debt.studentName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-slate-800 flex items-center space-x-3 mb-3 text-xl">
                            <span>{debt.studentName}</span>
                            <Badge variant={urgency.variant} className="text-sm px-3 py-1">
                              {urgency.label}
                            </Badge>
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-slate-600" />
                              <span className="text-2xl font-bold text-red-600">
                                ${debt.amount.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium">{debt.concept}</p>
                            <div className="flex items-center space-x-2 text-sm text-slate-500">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {debt.daysOverdue > 0 
                                  ? `${debt.daysOverdue} días de retraso`
                                  : "Vence hoy"
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/50">
                      <Button
                        onClick={() => sendDebtReminder(debt.id)}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl rounded-xl text-lg font-semibold transition-all duration-300 hover:shadow-2xl"
                      >
                        <MessageSquare className="w-5 h-5 mr-3" />
                        Enviar Recordatorio WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
