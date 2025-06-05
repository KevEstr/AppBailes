"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DollarSign, MessageSquare, Calendar, Send, Bell, AlertTriangle, CheckCircle, Clock, Receipt, MessageCircle } from "lucide-react"
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
    if (daysOverdue >= 30) return "border-red-500 bg-gradient-to-r from-red-950/50 to-pink-950/50"
    if (daysOverdue >= 15) return "border-orange-500 bg-gradient-to-r from-orange-950/50 to-amber-950/50"
    if (daysOverdue >= 7) return "border-amber-500 bg-gradient-to-r from-amber-950/50 to-yellow-950/50"
    return "border-blue-500 bg-gradient-to-r from-blue-950/50 to-cyan-950/50"
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
          <Card key={i} className="animate-pulse border-0 shadow-xl rounded-3xl bg-gray-800/90 border border-gray-600">
            <CardContent className="p-8">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Control Pagos Paradise</span>
              <p className="text-blue-300 mt-2 text-lg">Seguimiento de mensualidades pendientes</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Botón de envío masivo */}
      {debts.length > 0 && (
        <Card className="border-0 shadow-2xl mb-8 rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-6">
            <Button
              onClick={sendMassiveReminders}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl rounded-2xl text-xl font-bold transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1 text-white"
            >
              <Send className="w-6 h-6 mr-4" />
              Recordatorios Paradise ({debts.length})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de deudas */}
      <div className="space-y-6">
        {debts.length === 0 ? (
          <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center border border-green-500">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">¡Excelente Paradise!</h3>
              <p className="text-gray-300 text-xl">Todos los estudiantes están al día con sus pagos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {debts.map((debt) => {
              const urgency = getUrgencyBadge(debt.daysOverdue)
              return (
                <Card
                  key={debt.id}
                  className={`border-0 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:-translate-y-1 rounded-3xl bg-gray-800/90 border border-gray-600 hover:border-red-500 backdrop-blur-sm ${getUrgencyColor(debt.daysOverdue)}`}
                >
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center border border-blue-500">
                          <span className="text-white font-bold text-lg">{debt.studentName.charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white flex items-center space-x-3 mb-3 text-xl">
                            <span>{debt.studentName}</span>
                            <Badge {...urgency}>
                              {urgency.label}
                            </Badge>
                          </h4>
                          <div className="space-y-2 text-gray-300">
                            <p className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-blue-400" />
                              <span>Vence: {new Date(debt.lastPayment).toLocaleDateString()}</span>
                            </p>
                            <p className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-orange-400" />
                              <span>{debt.daysOverdue} días vencido</span>
                            </p>
                            <p className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-green-400" />
                              <span className="text-xl font-bold text-red-400">${debt.amount.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Button
                        onClick={() => sendDebtReminder(debt.id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-lg py-3"
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Enviar Recordatorio
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
