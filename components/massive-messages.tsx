"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Send,
  MessageCircle,
  Users,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Zap,
  Check,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: number // Cédula del estudiante
  name: string
  phone: string
  email: string
  hasDebt: boolean
  avatar?: string
  classes: { id: number; name: string }[]
}

interface MessageTemplate {
  id: string
  name: string
  message: string
  type: 'PAYMENT_REMINDER' | 'TRAINING_REMINDER' | 'ABSENCE_INQUIRY' | 'GENERAL'
}

export function MassiveMessages() {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [messageType, setMessageType] = useState<string>("")
  const [customMessage, setCustomMessage] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [loading, setLoading] = useState(false)

  const messageTemplates: MessageTemplate[] = [
    {
      id: "payment_reminder",
      name: "Recordatorio de Mensualidad",
      type: "PAYMENT_REMINDER",
      message: "¡Hola desde Paradise Dance Academy! 🌟 Te recordamos que tienes tu mensualidad pendiente. Para seguir disfrutando de nuestras increíbles clases de baile, por favor ponte al día. ¡Esperamos verte pronto en la pista! 💃🕺✨"
    },
    {
      id: "training_reminder",
      name: "Recordatorio de Clase",
      type: "TRAINING_REMINDER", 
      message: "¡Paradise Dance Academy te espera! 🎵 No olvides tu clase de hoy. Prepárate para brillar en la pista y seguir mejorando con nosotros. ¡Nos vemos para crear magia bailando! ✨💫"
    },
    {
      id: "absence_inquiry",
      name: "Te extrañamos en Paradise",
      type: "ABSENCE_INQUIRY",
      message: "¡Hola desde Paradise Dance Academy! 💖 Hemos notado tu ausencia y te extrañamos en nuestras clases. ¿Todo está bien? Estamos aquí para apoyarte y ayudarte a retomar tu pasión por el baile. ¡Paradise no es lo mismo sin ti! 🌟"
    },
    {
      id: "general",
      name: "Mensaje Paradise",
      type: "GENERAL",
      message: "¡Saludos desde Paradise Dance Academy! 🏆 Esperamos que estés bien y lleno de energía. Te escribimos para mantenerte conectado con tu familia de baile. ¡Gracias por ser parte de Paradise y hacer que cada día sea especial! 💃✨"
    }
  ]

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const response = await fetch("/api/students?active=true")
      const data = await response.json()
      if (data.success) {
        setStudents(data.students)
      }
    } catch (error) {
      console.error("Error loading students:", error)
    }
  }

  const getFilteredStudents = () => {
    switch (filterType) {
      case "debt":
        return students.filter(s => s.hasDebt)
      case "no_debt":
        return students.filter(s => !s.hasDebt)
      default:
        return students
    }
  }

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const selectAllFiltered = () => {
    const filteredIds = getFilteredStudents().map(s => s.id)
    setSelectedStudents(filteredIds)
  }

  const clearSelection = () => {
    setSelectedStudents([])
  }

  const sendMassiveMessages = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "❌ Error",
        description: "Selecciona al menos un estudiante",
        variant: "destructive"
      })
      return
    }

    if (!customMessage.trim()) {
      toast({
        title: "❌ Error", 
        description: "Escribe un mensaje",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/massive-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents,
          message: customMessage,
          type: messageType || "GENERAL"
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Mensajes Enviados",
          description: `${selectedStudents.length} mensajes enviados exitosamente`
        })
        setSelectedStudents([])
        setCustomMessage("")
        setMessageType("")
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "Error al enviar mensajes",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al enviar mensajes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = getFilteredStudents()

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Notificaciones Paradise</span>
              <p className="text-blue-300 mt-2 text-lg">Comunícate con tu familia de baile</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Panel de configuración de mensaje */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Configurar Mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-lg font-semibold text-gray-200">Plantilla de Mensaje</Label>
              <Select 
                value={messageType} 
                onValueChange={(value) => {
                  setMessageType(value)
                  const template = messageTemplates.find(t => t.id === value)
                  if (template) {
                    setCustomMessage(template.message)
                  }
                }}
              >
                <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {messageTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-white hover:bg-blue-600">
                      <div className="flex items-center space-x-3">
                        {template.type === 'PAYMENT_REMINDER' && <DollarSign className="w-5 h-5 text-red-600" />}
                        {template.type === 'TRAINING_REMINDER' && <Zap className="w-5 h-5 text-blue-600" />}
                        {template.type === 'ABSENCE_INQUIRY' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                        {template.type === 'GENERAL' && <MessageCircle className="w-5 h-5 text-green-600" />}
                        <div>
                          <div className="font-medium">{template.name}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message" className="text-lg font-semibold text-gray-200">
                Mensaje Personalizado
              </Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="border border-gray-600 focus:border-blue-500 rounded-2xl resize-none bg-gray-700 text-white"
                rows={6}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-400">
                  Variables: {'{'}nombre{'}'}, {'{'}clase{'}'}, {'{'}fecha{'}'}
                </span>
                <span className="text-sm text-gray-400">
                  {customMessage.length}/500 caracteres
                </span>
              </div>
            </div>

            {customMessage && (
              <Card className="bg-gray-700/50 border border-gray-600">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-white mb-2">Vista Previa:</h4>
                  <div className="bg-gray-600/50 p-3 rounded-lg border border-gray-500">
                    <p className="text-gray-300 whitespace-pre-line">{customMessage}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Panel de selección de estudiantes */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">Seleccionar Estudiantes</span>
              <Badge variant="outline" className="text-lg px-4 py-2 border-purple-500 text-purple-400 bg-purple-950/50">
                {selectedStudents.length} seleccionados
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label className="text-lg font-semibold text-gray-200">Filtrar por</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-blue-600">👥 Todos los estudiantes</SelectItem>
                    <SelectItem value="debt" className="text-white hover:bg-blue-600">💰 Con deudas</SelectItem>
                    <SelectItem value="no_debt" className="text-white hover:bg-blue-600">✨ Sin deudas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={selectAllFiltered}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Todos
                </Button>
                <Button 
                  onClick={clearSelection}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredStudents.map((student) => (
                <Card 
                  key={student.id} 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 border ${
                    selectedStudents.includes(student.id) 
                      ? 'border-blue-500 bg-blue-950/50' 
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                  }`}
                  onClick={() => toggleStudentSelection(student.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center border border-blue-500">
                          <span className="text-white font-bold text-lg">{student.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{student.name}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <span>📱 {student.phone}</span>
                            {student.hasDebt && <Badge variant="destructive" className="text-xs">Deuda</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {student.classes.length > 0 && (
                          <Badge variant="outline" className="border-gray-500 text-gray-300">
                            {student.classes.length} clases
                          </Badge>
                        )}
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          selectedStudents.includes(student.id) 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-500'
                        }`}>
                          {selectedStudents.includes(student.id) && (
                            <Check className="w-3 h-3 text-white m-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de envío */}
      {selectedStudents.length > 0 && customMessage && (
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm mt-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">¿Listo para enviar?</h3>
                <p className="text-gray-300">
                  Mensaje será enviado a {selectedStudents.length} estudiante{selectedStudents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button 
                onClick={sendMassiveMessages}
                disabled={loading}
                className="h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl text-lg font-bold transition-all duration-300 hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar Mensajes
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-2xl border border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{selectedStudents.length}</div>
                  <div className="text-sm text-gray-400">Destinatarios</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{customMessage.length}</div>
                  <div className="text-sm text-gray-400">Caracteres</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">WhatsApp</div>
                  <div className="text-sm text-gray-400">Plataforma</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
