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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: number // Cédula del estudiante
  name: string
  phone: string
  email: string
  hasDebt: boolean
  avatar?: string
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
      <Card className="border-0 bg-gradient-to-r from-stone-200 via-amber-100 to-orange-150 text-slate-900 shadow-2xl mb-8 rounded-3xl border-2 border-stone-500">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-teal-300 p-3 backdrop-blur-sm border border-teal-600">
              <MessageCircle className="h-8 w-8 text-teal-900" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-teal-800 to-amber-800 bg-clip-text text-transparent">Notificaciones Paradise</span>
              <p className="text-teal-900 mt-2 text-lg">Comunícate con tu familia de baile</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel de configuración */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-stone-200/80 border-2 border-stone-500">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">Configurar Mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plantillas de mensaje */}
            <div>
              <Label className="text-lg font-semibold text-slate-800">Plantilla de Mensaje</Label>
              <Select value={messageType} onValueChange={(value) => {
                setMessageType(value)
                const template = messageTemplates.find(t => t.id === value)
                if (template) {
                  setCustomMessage(template.message)
                }
              }}>
                <SelectTrigger className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900">
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {messageTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-lg">
                      <div className="flex items-center space-x-3">
                        {template.type === 'PAYMENT_REMINDER' && <DollarSign className="w-5 h-5 text-red-600" />}
                        {template.type === 'TRAINING_REMINDER' && <Zap className="w-5 h-5 text-blue-600" />}
                        {template.type === 'ABSENCE_INQUIRY' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                        {template.type === 'GENERAL' && <MessageCircle className="w-5 h-5 text-green-600" />}
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mensaje personalizado */}
            <div>
              <Label htmlFor="message" className="text-lg font-semibold text-slate-800">
                Mensaje Personalizado
              </Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl resize-none bg-amber-50/50 text-slate-900"
                rows={6}
              />
              <p className="text-sm text-slate-600 mt-2">
                {customMessage.length}/500 caracteres
              </p>
            </div>

            {/* Botón de envío */}
            <Button
              onClick={sendMassiveMessages}
              disabled={loading || selectedStudents.length === 0 || !customMessage.trim()}
              className="w-full h-16 bg-gradient-to-r from-teal-600 to-yellow-500 hover:from-teal-700 hover:to-yellow-600 shadow-2xl rounded-2xl text-xl font-bold transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1 text-white shadow-teal-500/50"
            >
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Enviando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Send className="w-6 h-6" />
                  <span>Enviar a {selectedStudents.length} estudiantes</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Panel de selección de estudiantes */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-stone-200/80 border-2 border-stone-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">Seleccionar Estudiantes</span>
              <Badge variant="outline" className="text-lg px-4 py-2 border-amber-600 text-amber-900 bg-amber-200">
                {selectedStudents.length} seleccionados
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold text-slate-800">Filtrar por</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-slate-600" />
                      <span>Todos los estudiantes</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debt" className="text-lg">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-red-600" />
                      <span>Con deudas</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="no_debt" className="text-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Sin deudas</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botones de selección */}
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                onClick={selectAllFiltered}
                className="flex-1 h-12 rounded-xl"
              >
                Seleccionar Todos ({filteredStudents.length})
              </Button>
              <Button 
                variant="outline" 
                onClick={clearSelection}
                className="flex-1 h-12 rounded-xl"
              >
                Limpiar Selección
              </Button>
            </div>

            {/* Lista de estudiantes */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No hay estudiantes disponibles</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div 
                    key={student.id}
                    className={`flex items-center space-x-4 p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md ${
                      selectedStudents.includes(student.id)
                        ? 'border-teal-600 bg-teal-200'
                        : 'border-stone-500 bg-stone-100 hover:border-stone-600'
                    }`}
                    onClick={() => toggleStudentSelection(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleStudentSelection(student.id)}
                      className="w-5 h-5"
                    />
                    
                    <Avatar className="w-12 h-12 ring-2 ring-white shadow-lg">
                      <AvatarImage src={student.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold">
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{student.name}</h4>
                      <div className="text-sm text-slate-600">
                        Cédula: {student.id} • {student.phone}
                      </div>
                      {student.hasDebt && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Deuda Pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
