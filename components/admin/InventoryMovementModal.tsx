"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Package, Plus, TrendingUp, TrendingDown, Trash2 } from "lucide-react"
import { ProductSearchSelect } from "./ProductSearchSelect"

interface InventoryItem {
  productId: number
  productName: string
  currentStock: number
  quantity: number
  price?: number // Precio de compra (solo para entradas)
}

interface InventoryMovement {
  items: InventoryItem[]
  reason: string
  reference: string
  notes: string
  paymentMethod?: string // Método de pago (solo para entradas)
}

interface InventoryMovementModalProps {
  isOpen: boolean
  movementType: "ENTRY" | "EXIT"
  onClose: () => void
  onSuccess?: () => void // Callback opcional para cuando se complete exitosamente
}

export function InventoryMovementModal({ 
  isOpen, 
  movementType, 
  onClose,
  onSuccess
}: InventoryMovementModalProps) {
  // Estado para la lista de productos (como factura)
  const [items, setItems] = useState<InventoryItem[]>([])
  
  // Estado para el producto que se está agregando
  const [currentProduct, setCurrentProduct] = useState<any>(null)
  const [currentQuantity, setCurrentQuantity] = useState<string>("")
  const [currentPrice, setCurrentPrice] = useState<string>("")
  
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [, setIsLoading] = useState(false)

  const isEntry = movementType === "ENTRY"
  
  // Estado para los datos de la factura
  const [reason, setReason] = useState<string>(isEntry ? "PURCHASE" : "ADJUSTMENT")
  const [reference, setReference] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>(isEntry ? "CASH" : "")
  const title = isEntry ? "Entrada de Inventario" : "Salida de Inventario"
  const icon = isEntry ? TrendingUp : TrendingDown
  const buttonColor = isEntry ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
  const saveButtonText = isEntry ? "Registrar Entradas" : "Registrar Salidas"

  useEffect(() => {
    if (isOpen) {
      setItems([])
      setCurrentProduct(null)
      setCurrentQuantity("")
      setCurrentPrice("")
      setReason(isEntry ? "PURCHASE" : "ADJUSTMENT")
      setReference("")
      setNotes("")
      setPaymentMethod(isEntry ? "CASH" : "")
      loadAvailableProducts()
    }
  }, [isOpen, isEntry])

  const loadAvailableProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/products?limit=1000")
      const data = await response.json()
      
      if (data.success) {
        setAvailableProducts(data.products)
      }
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Error",
        description: "Error al cargar productos disponibles",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    if (!currentProduct || !currentQuantity || parseFloat(currentQuantity) <= 0) {
      toast({
        title: "Error",
        description: "Selecciona un producto y una cantidad válida",
        variant: "destructive"
      })
      return
    }

    if (isEntry && (!currentPrice || parseFloat(currentPrice) < 0)) {
      toast({
        title: "Error",
        description: "Ingresa un precio válido para la entrada",
        variant: "destructive"
      })
      return
    }

    // Verificar si el producto ya está en la lista
    const existingItemIndex = items.findIndex(item => item.productId === currentProduct.id)
    
    if (existingItemIndex >= 0) {
      // Actualizar cantidad existente
      const updatedItems = [...items]
      updatedItems[existingItemIndex].quantity += parseFloat(currentQuantity)
      if (isEntry) {
        updatedItems[existingItemIndex].price = parseFloat(currentPrice)
      }
      setItems(updatedItems)
    } else {
      // Agregar nuevo producto
      const newItem: InventoryItem = {
        productId: currentProduct.id,
        productName: currentProduct.name,
        currentStock: currentProduct.stock || 0,
        quantity: parseFloat(currentQuantity),
        price: isEntry ? parseFloat(currentPrice) : undefined
      }
      setItems([...items, newItem])
    }

    // Limpiar formulario
    setCurrentProduct(null)
    setCurrentQuantity("")
    setCurrentPrice("")
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleProductSelect = (product: any) => {
    setCurrentProduct(product)
  }

  const handleSave = async () => {
    // Validaciones
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un producto",
        variant: "destructive"
      })
      return
    }

    if (!reason) {
      toast({
        title: "Error",
        description: "Selecciona un motivo para el movimiento",
        variant: "destructive"
      })
      return
    }

    if (isEntry && !paymentMethod) {
      toast({
        title: "Error",
        description: "Selecciona un método de pago para la entrada",
        variant: "destructive"
      })
      return
    }

    try {
      // Preparar los movimientos para la API
      const movements = items.map(item => ({
        productId: item.productId,
        movementType: isEntry ? "PURCHASE" : "ADJUSTMENT",
        quantity: isEntry ? item.quantity : -item.quantity, // Positivo para entradas, negativo para salidas
        price: item.price,
        reason,
        reference,
        notes
      }))

      // Llamar a la API directamente
      const response = await fetch("/api/admin/inventory/movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movements,
          paymentMethod: isEntry ? paymentMethod : undefined
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Éxito",
          description: data.message || "Movimiento registrado exitosamente",
        })
        onSuccess?.() // Llamar callback de éxito si existe
        onClose()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al registrar el movimiento",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving inventory movement:", error)
      toast({
        title: "Error",
        description: "Error interno del servidor",
        variant: "destructive"
      })
    }
  }

  const getReasonOptions = () => {
    if (isEntry) {
      return [
        { value: "PURCHASE", label: "Compra" },
        { value: "ADJUSTMENT", label: "Ajuste de Inventario" },
        { value: "RETURN", label: "Devolución" },
        { value: "TRANSFER", label: "Transferencia" }
      ]
    } else {
      return [
        { value: "ADJUSTMENT", label: "Ajuste de Inventario" },
        { value: "WASTE", label: "Pérdida/Desperdicio" },
        { value: "TRANSFER", label: "Transferencia" },
        { value: "SALE", label: "Venta" }
      ]
    }
  }

  const getPaymentMethodOptions = () => {
    return [
      { value: "CASH", label: "Efectivo" },
      { value: "TRANSFER", label: "Transferencia" },
      { value: "CARD", label: "Tarjeta" },
      { value: "CREDIT", label: "Crédito" }
    ]
  }

  const IconComponent = icon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Formulario para agregar productos */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Agregar Productos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <Label>Producto</Label>
                <ProductSearchSelect
                  products={availableProducts}
                  selectedProduct={currentProduct}
                  onProductSelect={handleProductSelect}
                  placeholder="Buscar producto..."
                  showStock={true}
                  showPrice={true}
                  showCategory={true}
                />
              </div>
              
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              {isEntry && (
                <div>
                  <Label>Precio de Compra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={addItem} className={buttonColor} disabled={!currentProduct || !currentQuantity}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar a la Lista
              </Button>
            </div>
          </Card>

          {/* Lista de productos agregados */}
          {items.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Productos en la Factura</h3>
              <div className="max-h-60 overflow-y-auto">
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={`item-${item.productId}-${index}`} className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{item.productName}</div>
                          <div className="text-sm text-gray-400">Stock: {item.currentStock} unidades</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-medium text-white">Cantidad: {item.quantity}</div>
                          {isEntry && item.price && (
                            <div className="text-sm text-green-400">${item.price.toLocaleString()}</div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 border-red-500 hover:border-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Datos de la factura */}
          {items.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Datos de la Factura</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Motivo</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {getReasonOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Referencia</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Factura, orden, etc."
                  />
                </div>

                {isEntry && (
                  <div>
                    <Label>Método de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        {getPaymentMethodOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className={isEntry ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-2 lg:col-span-2"}>
                  <Label>Notas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-gray-600 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className={buttonColor}
            disabled={items.length === 0}
          >
            {saveButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
