"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2, Plus, Minus } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export interface SellProductData {
  id: number
  name: string
  price: number
  stock: number
  imageUrl?: string
  productType?: "SIMPLE" | "COMPOSITE"
  allowNegativeStock?: boolean
}

interface ProductSellModalProps {
  readonly isOpen: boolean
  readonly product: SellProductData | null
  readonly onClose: () => void
  readonly onCompleted?: () => void
}

export function ProductSellModal({ isOpen, product, onClose, onCompleted }: ProductSellModalProps) {
  const [quantity, setQuantity] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setQuantity(1)
      setPaymentMethod("CASH")
      setShowConfirm(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const total = useMemo(() => {
    const price = product?.price ?? 0
    const qty = quantity > 0 ? quantity : 0
    return price * qty
  }, [product, quantity])

  const formatPrice = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value)

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: "Efectivo",
      TRANSFER: "Transferencia",
      CARD: "Tarjeta",
    };
    return labels[method] || method;
  };

  const incrementQuantity = () => {
    if (!product) return
    
    // Verificar límite de stock si el producto no permite stock negativo
    if (product.productType === "SIMPLE" && product.allowNegativeStock === false) {
      const maxQuantity = product.stock || 0
      if (quantity < maxQuantity) {
        setQuantity(prev => prev + 1)
      } else {
        toast({ 
          title: "Stock insuficiente", 
          description: `Stock disponible: ${maxQuantity}`,
          variant: "destructive"
        })
      }
    } else {
      setQuantity(prev => prev + 1)
    }
  }

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1))
  }

  const handleSubmit = async () => {
    if (!product) return
    if (quantity <= 0) {
      toast({ title: "Cantidad inválida", description: "Ingresa una cantidad mayor a 0" })
      return
    }
    // Solo validar stock si el producto no permite stock negativo
    if (product.productType === "SIMPLE" && product.allowNegativeStock === false && quantity > (product.stock || 0)) {
      toast({ title: "Stock insuficiente", description: `Stock disponible: ${product.stock || 0}` })
      return
    }
    if (!paymentMethod) {
      toast({ title: "Método de pago requerido", description: "Selecciona un método de pago" })
      return
    }
    setShowConfirm(true)
  }

  const confirmSale = async () => {
    if (!product) return
    try {
      setIsSubmitting(true)
      const res = await fetch("/api/product-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity, paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({ title: "Error", description: data.error || "No se pudo registrar la venta" })
        return
      }
      toast({ title: "Venta registrada", description: `${quantity} x ${product.name} por ${formatPrice(total)} - ${getPaymentMethodLabel(paymentMethod)}` })
      onCompleted?.()
      onClose()
    } catch (error) {
      console.error("Error completing sale:", error)
      toast({ title: "Error de red", description: "No se pudo completar la operación" })
    } finally {
      setIsSubmitting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px] bg-gray-800/95 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white">Vender Producto</DialogTitle>
          </DialogHeader>
          {product && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-700 border border-gray-600 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 text-xs">Sin imagen</div>
                  )}
                </div>
                <div>
                  <div className="text-white font-medium">{product.name}</div>
                  <div className="text-gray-300 text-sm">Precio: {formatPrice(product.price)}</div>
                  <div className="text-gray-400 text-xs">Stock: {product.stock}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200">Cantidad</Label>
                  {product.productType === "SIMPLE" && product.allowNegativeStock === false && (
                    <span className="text-xs text-gray-400">
                      Stock: {product.stock || 0}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="h-10 w-10 border-gray-600 text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <div className="min-w-[60px] text-center">
                    <span className="text-2xl font-bold text-white">{quantity}</span>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={incrementQuantity}
                    className="h-10 w-10 border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-gray-200">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-gray-700/50 border border-gray-600">
                <span className="text-gray-300">Total a recibir</span>
                <span className="text-green-400 font-semibold">{formatPrice(total)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-200">Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Completar compra
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de registrar la venta de {quantity} unidad(es){product ? ` de "${product.name}"` : ""} por {formatPrice(total)} mediante {getPaymentMethodLabel(paymentMethod)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSale} className="bg-green-600 hover:bg-green-700">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


