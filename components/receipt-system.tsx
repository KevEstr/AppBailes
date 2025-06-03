"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Send, DollarSign, CreditCard, Gift, Smartphone, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ReceiptSystem() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    studentId: "", // Cédula del estudiante
    studentName: "",
    phone: "",
    amount: "",
    concept: "",
    paymentMethod: "",
    promotion: "",
    notes: "",
  })

  const concepts = ["Inscripción", "Mensualidad", "Entrenamiento Físico", "Clase Particular", "Evento Especial"]

  const promotions = [
    { id: "none", label: "Sin promoción", type: "normal" },
    { id: "academia_50", label: "50% Off Academia", type: "academia" },
    { id: "club_30", label: "30% Off Club", type: "club" },
    { id: "referido", label: "Descuento Referido", type: "academia" },
    { id: "estudiante", label: "Descuento Estudiante", type: "club" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const submitData = {
        ...formData,
        // Si se proporciona studentId (cédula), convertir a número
        ...(formData.studentId && { studentId: parseInt(formData.studentId) })
      }

      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Recibo Enviado",
          description: `WhatsApp enviado a ${formData.studentName}`,
        })
        setFormData({
          studentId: "",
          studentName: "",
          phone: "",
          amount: "",
          concept: "",
          paymentMethod: "",
          promotion: "",
          notes: "",
        })
      } else {
        toast({
          title: "❌ Error",
          description: result.error || "No se pudo procesar el recibo",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo enviar el recibo",
        variant: "destructive",
      })
    }
  }

  const selectedPromotion = promotions.find((p) => p.id === formData.promotion)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-stone-200 via-amber-100 to-orange-150 text-slate-900 shadow-2xl mb-8 rounded-3xl border-2 border-stone-500">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-teal-300 p-3 backdrop-blur-sm border border-teal-600">
              <Smartphone className="h-8 w-8 text-teal-900" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-teal-800 to-amber-800 bg-clip-text text-transparent">Recibos Paradise</span>
              <p className="text-teal-900 mt-2 text-lg">Recibos digitales para estudiantes de baile</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-2xl rounded-3xl bg-stone-200/80 border-2 border-stone-500">
            <CardContent className="p-8 space-y-8">
              {/* Datos del Estudiante */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 border-b-2 border-stone-500 pb-3">
                  Datos del Estudiante
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="studentId" className="text-slate-800 font-semibold text-lg">
                    Cédula (opcional)
                  </Label>
                  <Input
                    id="studentId"
                    type="number"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="Ej: 12345678"
                    className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900"
                  />
                  <p className="text-sm text-slate-600">
                    💡 Si el estudiante ya existe, se usarán sus datos automáticamente
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="studentName" className="text-slate-800 font-semibold text-lg">
                    Nombre Completo
                  </Label>
                  <Input
                    id="studentName"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    placeholder="Ej: María González"
                    className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-slate-800 font-semibold text-lg">
                    WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                    className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Datos del Pago */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 border-b-2 border-stone-500 pb-3">
                  Información del Pago
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-slate-800 font-semibold text-lg">
                      Monto ($)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                      className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="concept" className="text-slate-800 font-semibold text-lg">
                      Concepto
                    </Label>
                    <Select
                      value={formData.concept}
                      onValueChange={(value) => setFormData({ ...formData, concept: value })}
                    >
                      <SelectTrigger className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {concepts.map((concept) => (
                          <SelectItem key={concept} value={concept} className="text-lg">
                            {concept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="paymentMethod" className="text-slate-800 font-semibold text-lg">
                    Método de Pago
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900">
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-lg">Efectivo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="transferencia">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <span className="text-lg">Transferencia</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tarjeta">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          <span className="text-lg">Tarjeta</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Columna derecha - Promociones y Vista Previa */}
          <div className="space-y-8">
            {/* Promociones */}
            <Card className="border-0 shadow-2xl rounded-3xl bg-stone-200/80 border-2 border-stone-500">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-slate-900 border-b-2 border-stone-500 pb-3">
                    Promociones
                  </h3>

                  <div className="space-y-3">
                    <Label className="text-slate-800 font-semibold text-lg">Promoción Aplicada</Label>
                    <Select
                      value={formData.promotion}
                      onValueChange={(value) => setFormData({ ...formData, promotion: value })}
                    >
                      <SelectTrigger className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl h-14 text-lg bg-stone-100 text-slate-900">
                        <SelectValue placeholder="Seleccionar promoción" />
                      </SelectTrigger>
                      <SelectContent>
                        {promotions.map((promo) => (
                          <SelectItem key={promo.id} value={promo.id} className="text-lg">
                            <div className="flex items-center space-x-3">
                              <Gift className="w-5 h-5 text-pink-600" />
                              <span>{promo.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPromotion && selectedPromotion.id !== "none" && (
                    <div className="p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl border-2 border-pink-300">
                      <div className="flex items-center space-x-3">
                        <Gift className="w-6 h-6 text-pink-600" />
                        <div>
                          <h4 className="font-bold text-gray-800">{selectedPromotion.label}</h4>
                          <Badge 
                            variant={selectedPromotion.type === "academia" ? "default" : "secondary"}
                            className="mt-2 bg-cyan-100 text-cyan-700 border-cyan-300"
                          >
                            {selectedPromotion.type === "academia" ? "Academia" : "Club"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="notes" className="text-slate-800 font-semibold text-lg">
                      Notas Adicionales
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notas opcionales..."
                      className="border-2 border-stone-500 focus:border-teal-600 rounded-2xl resize-none bg-amber-50/50 text-slate-900"
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vista Previa */}
            <Card className="border-0 shadow-2xl rounded-3xl bg-gradient-to-br from-stone-150/90 to-amber-100/90 border-2 border-stone-500">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b-2 border-stone-500 pb-3">
                  Vista Previa del Recibo
                </h3>

                <div className="space-y-4 text-slate-800">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Estudiante:</span>
                    <span>{formData.studentName || "---"}</span>
                  </div>
                  {formData.studentId && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">Cédula:</span>
                      <span>{formData.studentId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">WhatsApp:</span>
                    <span>{formData.phone || "---"}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold text-amber-900">
                    <span>Monto:</span>
                    <span>${formData.amount || "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Concepto:</span>
                    <span>{formData.concept || "---"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Método:</span>
                    <span>{formData.paymentMethod || "---"}</span>
                  </div>
                  {selectedPromotion && selectedPromotion.id !== "none" && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">Promoción:</span>
                      <Badge variant="outline" className="text-amber-900 border-amber-600 bg-amber-200">
                        {selectedPromotion.label}
                      </Badge>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-8 h-16 bg-gradient-to-r from-teal-600 to-amber-600 hover:from-teal-700 hover:to-amber-700 shadow-2xl rounded-2xl text-xl font-bold transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1 text-white"
                  disabled={!formData.studentName || !formData.phone || !formData.amount || !formData.concept || !formData.paymentMethod}
                >
                  <Send className="w-6 h-6 mr-4" />
                  Enviar Recibo por WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
