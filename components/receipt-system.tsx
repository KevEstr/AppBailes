"use client"

import type React from "react"
import { useState, useCallback, useMemo } from "react"
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

  // ✅ OPTIMIZACIÓN: Memoizar arrays para evitar recreaciones
  const concepts = useMemo(() => [
    "Inscripción", "Mensualidad", "Entrenamiento Físico", "Clase Particular", "Evento Especial"
  ], [])

  const promotions = useMemo(() => [
    { id: "none", label: "Sin promoción", type: "normal" },
    { id: "academia_50", label: "50% Off Academia", type: "academia" },
    { id: "club_30", label: "30% Off Club", type: "club" },
    { id: "referido", label: "Descuento Referido", type: "academia" },
    { id: "estudiante", label: "Descuento Estudiante", type: "club" },
  ], [])

  // Función para obtener el descuento de la promoción
  const getPromotionDiscount = useCallback((promotionId: string) => {
    switch (promotionId) {
      case "academia_50":
        return 50
      case "club_30":
        return 30
      case "referido":
        return 15
      case "estudiante":
        return 10
      default:
        return 0
    }
  }, [])

  // ✅ OPTIMIZACIÓN: useCallback para evitar recreación
  const applyPromotion = useCallback((promotionId: string) => {
    // Lógica adicional si es necesaria para aplicar la promoción
    console.log(`Promoción aplicada: ${promotionId}`)
  }, [])

  // ✅ OPTIMIZACIÓN: Cálculos memoizados
  const calculatedAmounts = useMemo(() => {
    const amount = typeof formData.amount === 'string' ? parseFloat(formData.amount) || 0 : Number(formData.amount) || 0
    const discount = formData.promotion !== 'none' ? getPromotionDiscount(formData.promotion) : 0
    const finalAmount = amount - ((amount * discount) / 100)
    
    return { amount, discount, finalAmount }
  }, [formData.amount, formData.promotion, getPromotionDiscount])

  // ✅ OPTIMIZACIÓN: useCallback para handleSubmit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [formData, toast])

  // ✅ OPTIMIZACIÓN: useCallback para updateFormData
  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // ✅ OPTIMIZACIÓN: Promoción seleccionada memoizada
  const selectedPromotion = useMemo(() => 
    promotions.find((p) => p.id === formData.promotion), 
    [promotions, formData.promotion]
  )

  // ✅ OPTIMIZACIÓN: generateReceipt con useCallback
  const generateReceipt = useCallback(() => {
    if (!formData.studentName || !calculatedAmounts.amount) {
      toast({
        title: "❌ Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive",
      })
      return
    }

    // Aquí iría la lógica de generación del recibo
    toast({
      title: "✅ Recibo Generado",
      description: "El recibo ha sido generado exitosamente",
    })
  }, [formData.studentName, calculatedAmounts.amount, toast])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-gray-800/90 via-slate-800/90 to-gray-700/90 text-white shadow-2xl mb-8 rounded-3xl border border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-4">
            <div className="rounded-2xl bg-blue-600 p-3 backdrop-blur-sm border border-blue-500">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Recibos Paradise</span>
              <p className="text-blue-300 mt-2 text-lg">Sistema de recibos digitales automáticos</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-white border-b border-gray-600 pb-3">
              💰 Datos del Estudiante
            </h3>
            <div className="space-y-6">
              <div>
                <Label htmlFor="studentId" className="text-gray-200 font-semibold text-lg">
                  Cédula del Estudiante
                </Label>
                <Input
                  id="studentId"
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => updateFormData('studentId', e.target.value)}
                  placeholder="Ej: 12345678"
                  className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="studentName" className="text-gray-200 font-semibold text-lg">
                  Nombre Completo
                </Label>
                <Input
                  id="studentName"
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => updateFormData('studentName', e.target.value)}
                  placeholder="Nombre del estudiante"
                  className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-200 font-semibold text-lg">
                  Teléfono de Contacto
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="Ej: +57 300 123 4567"
                  className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white"
                />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white border-b border-gray-600 pb-3 mt-8">
              💳 Detalles del Pago
            </h3>
            <div className="space-y-6">
              <div>
                <Label htmlFor="amount" className="text-gray-200 font-semibold text-lg">
                  Monto a Pagar
                </Label>
                                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => updateFormData('amount', e.target.value)}
                    placeholder="Ingrese el monto"
                    className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white"
                  />
              </div>

              <div>
                <Label htmlFor="concept" className="text-gray-200 font-semibold text-lg">
                  Concepto del Pago
                </Label>
                <Select value={formData.concept} onValueChange={(value) => updateFormData('concept', value)}>
                  <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                    <SelectValue placeholder="Seleccionar concepto" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="mensualidad" className="text-white hover:bg-blue-600">Mensualidad</SelectItem>
                    <SelectItem value="inscripcion" className="text-white hover:bg-blue-600">Inscripción</SelectItem>
                    <SelectItem value="clase-particular" className="text-white hover:bg-blue-600">Clase Particular</SelectItem>
                    <SelectItem value="evento" className="text-white hover:bg-blue-600">Evento Especial</SelectItem>
                    <SelectItem value="otro" className="text-white hover:bg-blue-600">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-gray-200 font-semibold text-lg">
                  Método de Pago
                </Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => updateFormData('paymentMethod', value)}>
                  <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="efectivo" className="text-white hover:bg-blue-600">💵 Efectivo</SelectItem>
                    <SelectItem value="transferencia" className="text-white hover:bg-blue-600">🏦 Transferencia Bancaria</SelectItem>
                    <SelectItem value="nequi" className="text-white hover:bg-blue-600">📱 Nequi</SelectItem>
                    <SelectItem value="daviplata" className="text-white hover:bg-blue-600">📱 Daviplata</SelectItem>
                    <SelectItem value="tarjeta" className="text-white hover:bg-blue-600">💳 Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promociones y notas */}
        <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-white border-b border-gray-600 pb-3">
              🎉 Promociones Disponibles
            </h3>
            <div className="mb-6">
              <Label className="text-gray-200 font-semibold text-lg">Promoción Aplicada</Label>
              <Select 
                value={formData.promotion} 
                onValueChange={(value) => {
                  updateFormData('promotion', value)
                  applyPromotion(value)
                }}
              >
                <SelectTrigger className="border border-gray-600 focus:border-blue-500 rounded-2xl h-14 text-lg bg-gray-700 text-white">
                  <SelectValue placeholder="Seleccionar promoción" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="none" className="text-white hover:bg-blue-600">Sin promoción</SelectItem>
                  {promotions.map((promo) => (
                    <SelectItem key={promo.id} value={promo.id} className="text-white hover:bg-blue-600">
                      {promo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Promociones destacadas */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              {promotions.slice(0, 3).map((promo) => (
                <Card 
                  key={promo.id} 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 border ${
                    formData.promotion === promo.id 
                      ? 'border-purple-500 bg-purple-950/50' 
                      : 'border-gray-600 bg-gray-700/50'
                  }`}
                  onClick={() => {
                    updateFormData('promotion', promo.id)
                    applyPromotion(promo.id)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white">{promo.label}</h4>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Label htmlFor="notes" className="text-gray-200 font-semibold text-lg">
                Notas Adicionales
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Observaciones o comentarios especiales..."
                className="border border-gray-600 focus:border-blue-500 rounded-2xl resize-none bg-gray-700 text-white"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vista previa del recibo */}
      <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm mt-8">
        <CardContent className="p-8">
          <h3 className="text-2xl font-bold text-white mb-6 border-b border-gray-600 pb-3">
            📄 Vista Previa del Recibo
          </h3>
          
          <div className="space-y-4 text-gray-300">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p><strong className="text-white">Estudiante:</strong> {formData.studentName || 'No especificado'}</p>
                <p><strong className="text-white">Cédula:</strong> {formData.studentId || 'No especificado'}</p>
                <p><strong className="text-white">Teléfono:</strong> {formData.phone || 'No especificado'}</p>
              </div>
              <div>
                <p><strong className="text-white">Concepto:</strong> {formData.concept || 'No especificado'}</p>
                <p><strong className="text-white">Método:</strong> {formData.paymentMethod || 'No especificado'}</p>
                <p><strong className="text-white">Fecha:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="bg-gray-700/50 p-6 rounded-2xl border border-gray-600">
              <div className="flex justify-between items-center text-lg mb-2">
                <span className="text-white">Subtotal:</span>
                <span className="text-white">${calculatedAmounts.amount.toLocaleString()}</span>
              </div>
              {formData.promotion !== 'none' && (
                <div className="flex justify-between items-center text-lg mb-2">
                  <span className="text-green-400">Descuento:</span>
                  <span className="text-green-400">-${((calculatedAmounts.amount * getPromotionDiscount(formData.promotion)) / 100).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="text-white">Total a Pagar:</span>
                  <span className="text-blue-400">${calculatedAmounts.finalAmount.toLocaleString()}</span>
                </div>
              </div>
              {formData.promotion !== 'none' && (
                <Badge className="bg-purple-600 text-white mt-2">
                  Promoción aplicada: {getPromotionDiscount(formData.promotion)}% descuento
                </Badge>
              )}
            </div>
          </div>

          <div className="flex space-x-4 mt-8">
            <Button 
              onClick={generateReceipt}
              className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl text-xl font-bold transition-all duration-300 hover:shadow-xl"
              disabled={!formData.studentName || !calculatedAmounts.amount}
            >
              <Send className="w-6 h-6 mr-2" />
              Generar Recibo Digital
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
