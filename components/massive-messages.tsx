"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Users, Calendar, AlertCircle, Send, Megaphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function MassiveMessages() {
  const { toast } = useToast()
  const [messageData, setMessageData] = useState({
    type: "",
    message: "",
    targetGroup: "",
  })

  const messageTypes = [
    {
      id: "payment_reminder",
      label: "Recordatorio de Pago",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "from-red-500 to-pink-600",
    },
    {
      id: "training_reminder",
      label: "Recordatorio de Entrenamiento",
      icon: Calendar,
      color: "text-blue-600",
      bg: "from-blue-500 to-indigo-600",
    },
    {
      id: "absence_inquiry",
      label: "Consulta por Ausencia",
      icon: Users,
      color: "text-amber-600",
      bg: "from-amber-500 to-orange-600",
    },
    {
      id: "general",
      label: "Mensaje General",
      icon: MessageSquare,
      color: "text-slate-600",
      bg: "from-slate-500 to-slate-600",
    },
  ]

  const targetGroups = [
    "Todos los estudiantes",
    "Estudiantes con deudas",
    "Grupo Principiantes",
    "Grupo Intermedio",
    "Grupo Avanzado",
    "Entrenamiento Físico",
    "Clases Particulares",
  ]

  const messageTemplates = {
    payment_reminder:
      "🕺💃 ¡Hola! Te recordamos que tienes un pago pendiente en nuestra academia. Por favor, ponte al día para continuar disfrutando de nuestras clases de baile. ¡Gracias!",
    training_reminder:
      "🎵 ¡No olvides tu clase de hoy! Te esperamos en la academia para seguir mejorando tus pasos de baile. ¡Nos vemos pronto!",
    absence_inquiry:
      "😊 Hola, notamos que no asististe a tu última clase. ¿Todo está bien? Queremos asegurarnos de que puedas continuar con tu aprendizaje. ¡Escríbenos!",
    general: "",
  }

  const handleTypeChange = (type: string) => {
    setMessageData({
      ...messageData,
      type,
      message: messageTemplates[type as keyof typeof messageTemplates] || "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/massive-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Mensajes Enviados",
          description: `${result.count} mensajes enviados exitosamente`,
        })
        setMessageData({
          type: "",
          message: "",
          targetGroup: "",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron enviar los mensajes",
        variant: "destructive",
      })
    }
  }

  const selectedType = messageTypes.find((t) => t.id === messageData.type)
  const estimatedCount = Math.floor(Math.random() * 50) + 10

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-2xl mb-8 rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Megaphone className="h-8 w-8" />
            </div>
            <div>
              <span className="text-3xl font-bold">Mensajes Masivos</span>
              <p className="text-blue-200 mt-2 text-lg">Comunicación masiva por WhatsApp</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-2xl rounded-3xl">
            <CardContent className="p-8 space-y-8">
              {/* Tipo de Mensaje */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-200 pb-3">Tipo de Mensaje</h3>

                <div className="space-y-3">
                  <Label htmlFor="messageType" className="text-slate-700 font-semibold text-lg">
                    Seleccionar Tipo
                  </Label>
                  <Select value={messageData.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="border-2 border-slate-300 focus:border-blue-500 rounded-2xl h-14 text-lg">
                      <SelectValue placeholder="Seleccionar tipo de mensaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center space-x-4">
                            <type.icon className={`w-5 h-5 ${type.color}`} />
                            <span className="text-lg">{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedType && (
                  <Card className={`bg-gradient-to-r ${selectedType.bg} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <selectedType.icon className="w-6 h-6 text-white" />
                        <span className="font-bold text-white text-lg">Tipo: {selectedType.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Grupo Objetivo */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-200 pb-3">Destinatarios</h3>

                <div className="space-y-3">
                  <Label htmlFor="targetGroup" className="text-slate-700 font-semibold text-lg">
                    Grupo Objetivo
                  </Label>
                  <Select
                    value={messageData.targetGroup}
                    onValueChange={(value) => setMessageData({ ...messageData, targetGroup: value })}
                  >
                    <SelectTrigger className="border-2 border-slate-300 focus:border-blue-500 rounded-2xl h-14 text-lg">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          <div className="flex items-center space-x-3">
                            <Users className="w-5 h-5 text-slate-600" />
                            <span className="text-lg">{group}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {messageData.targetGroup && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Users className="w-6 h-6 text-blue-600" />
                          <span className="font-bold text-blue-800 text-lg">Enviando a: {messageData.targetGroup}</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                          ~{estimatedCount} personas
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl rounded-3xl">
            <CardContent className="p-8 space-y-8">
              {/* Mensaje */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-200 pb-3">
                  Contenido del Mensaje
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="message" className="text-slate-700 font-semibold text-lg">
                    Mensaje
                  </Label>
                  <Textarea
                    id="message"
                    value={messageData.message}
                    onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={14}
                    className="border-2 border-slate-300 focus:border-blue-500 rounded-2xl text-lg"
                    required
                  />
                  <div className="flex justify-between text-sm text-slate-500">
                    <span className="font-medium">Caracteres: {messageData.message.length}/1000</span>
                    <span className="font-medium">WhatsApp optimizado</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botón de Envío */}
        <Button
          type="submit"
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xl rounded-2xl transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1"
          size="lg"
          disabled={!messageData.type || !messageData.message || !messageData.targetGroup}
        >
          <Send className="w-6 h-6 mr-4" />
          Enviar Mensajes Masivos
        </Button>
      </form>
    </div>
  )
}
