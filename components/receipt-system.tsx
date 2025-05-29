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
import { Send, DollarSign, CreditCard, Gift, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ReceiptSystem() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
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
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Recibo Enviado",
          description: `WhatsApp enviado a ${formData.studentName}`,
        })
        setFormData({
          studentName: "",
          phone: "",
          amount: "",
          concept: "",
          paymentMethod: "",
          promotion: "",
          notes: "",
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
      <Card className="border-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-2xl mb-8 rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Smartphone className="h-8 w-8" />
            </div>
            <div>
              <span className="text-3xl font-bold">Recibos WhatsApp</span>
              <p className="text-emerald-200 mt-2 text-lg">Envío automático de recibos de pago</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-2xl rounded-3xl">
            <CardContent className="p-8 space-y-8">
              {/* Datos del Estudiante */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-b-2 border-emerald-200 pb-3">
                  Datos del Estudiante
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="studentName" className="text-slate-700 font-semibold text-lg">
                    Nombre Completo
                  </Label>
                  <Input
                    id="studentName"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    placeholder="Ej: María González"
                    className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl h-14 text-lg"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-slate-700 font-semibold text-lg">
                    WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+58 414 123 4567"
                    className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl h-14 text-lg"
                    required
                  />
                </div>
              </div>

              {/* Datos del Pago */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-b-2 border-emerald-200 pb-3">
                  Información del Pago
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-slate-700 font-semibold text-lg">
                      Monto ($)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl h-14 text-lg"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="concept" className="text-slate-700 font-semibold text-lg">
                      Concepto
                    </Label>
                    <Select
                      value={formData.concept}
                      onValueChange={(value) => setFormData({ ...formData, concept: value })}
                    >
                      <SelectTrigger className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl h-14 text-lg">
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
                  <Label htmlFor="paymentMethod" className="text-slate-700 font-semibold text-lg">
                    Método de Pago
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl h-14 text-lg">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl rounded-3xl">
            <CardContent className="p-8 space-y-8">
              {/* Promociones */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 border-b-2 border-emerald-200 pb-3">Promociones</h3>

                <div className="space-y-3">
                  <Label htmlFor="promotion" className="text-slate-700 font-semibold text-lg">
                    Promoción Aplicada
                  </Label>
                  <Select
                    value={formData.promotion}
                    onValueChange={(value) => setFormData({ ...formData, promotion: value })}
                  >
                    <SelectTrigger className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl h-14 text-lg">
                      <SelectValue placeholder="Seleccionar promoción" />
                    </SelectTrigger>
                    <SelectContent>
                      {promotions.map((promo) => (
                        <SelectItem key={promo.id} value={promo.id}>
                          <div className="flex items-center space-x-3">
                            <Gift className="w-5 h-5 text-amber-600" />
                            <span className="text-lg">{promo.label}</span>
                            {promo.type !== "normal" && (
                              <Badge variant={promo.type === "academia" ? "default" : "secondary"} className="text-sm">
                                {promo.type === "academia" ? "Academia" : "Club"}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPromotion && selectedPromotion.id !== "none" && (
                  <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Gift className="w-6 h-6 text-amber-600" />
                        <span className="font-bold text-amber-800 text-lg">Promoción: {selectedPromotion.label}</span>
                        <Badge
                          variant={selectedPromotion.type === "academia" ? "default" : "secondary"}
                          className="bg-amber-100 text-amber-800"
                        >
                          {selectedPromotion.type === "academia" ? "Academia" : "Club"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-slate-700 font-semibold text-lg">
                  Notas Adicionales
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional para el recibo..."
                  rows={6}
                  className="border-2 border-slate-300 focus:border-emerald-500 rounded-2xl text-lg"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botón de Envío */}
        <Button
          type="submit"
          className="w-full h-16 text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-2xl rounded-2xl transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1"
          size="lg"
        >
          <Send className="w-6 h-6 mr-4" />
          Enviar Recibo por WhatsApp
        </Button>
      </form>
    </div>
  )
}
