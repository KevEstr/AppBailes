"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash2, Package } from "lucide-react"
import { ProductSearchSelect } from "./ProductSearchSelect"

interface Ingredient {
  id?: number
  ingredientId: number
  ingredientName: string
  quantity: number
  unit?: string
  currentStock?: number
}

interface ProductIngredientsModalProps {
  isOpen: boolean
  ingredients: Ingredient[]
  onSave: (ingredients: Ingredient[]) => void
  onClose: () => void
}

export function ProductIngredientsModal({ 
  isOpen, 
  ingredients: initialIngredients, 
  onSave, 
  onClose 
}: ProductIngredientsModalProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients)
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>({})

  useEffect(() => {
    if (isOpen) {
      setIngredients(initialIngredients)
      // Inicializar los inputs de cantidad
      const inputs: Record<number, string> = {}
      initialIngredients.forEach((ing, index) => {
        inputs[index] = ing.quantity.toString()
      })
      setQuantityInputs(inputs)
      loadAvailableIngredients()
    }
  }, [isOpen, initialIngredients])

  const loadAvailableIngredients = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/products/ingredients")
      const data = await response.json()
      
      if (data.success) {
        setAvailableIngredients(data.ingredients)
      }
    } catch (error) {
      console.error("Error loading ingredients:", error)
      toast({
        title: "Error",
        description: "Error al cargar ingredientes disponibles",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addIngredient = () => {
    const newIndex = ingredients.length
    setIngredients([...ingredients, {
      ingredientId: 0,
      ingredientName: "",
      quantity: 0,
      unit: ""
    }])
    setQuantityInputs({...quantityInputs, [newIndex]: "0"})
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
    // Limpiar el input correspondiente
    const newInputs = { ...quantityInputs }
    delete newInputs[index]
    setQuantityInputs(newInputs)
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients]
    
    // Manejar el campo quantity de manera especial para permitir decimales
    if (field === "quantity") {
      // Actualizar el input local
      setQuantityInputs({...quantityInputs, [index]: value})
      
      // Actualizar el valor numérico
      if (value === "" || value === ".") {
        updated[index] = { ...updated[index], [field]: 0 }
      } else {
        const numValue = parseFloat(value)
        updated[index] = { ...updated[index], [field]: isNaN(numValue) ? 0 : numValue }
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    
    setIngredients(updated)
  }

  const handleProductSelect = (index: number, product: any) => {
    const updated = [...ingredients]
    updated[index] = {
      ...updated[index],
      ingredientId: product.id,
      ingredientName: product.name,
      currentStock: product.stock
    }
    setIngredients(updated)
  }

  const handleSave = () => {
    // Validaciones
    const hasEmptyIngredients = ingredients.some(ing => 
      !ing.ingredientId || ing.quantity <= 0 || isNaN(ing.quantity)
    )
    
    if (hasEmptyIngredients) {
      toast({
        title: "Error",
        description: "Todos los ingredientes deben tener un producto seleccionado y cantidad mayor a 0",
        variant: "destructive"
      })
      return
    }

    const hasDuplicates = ingredients.some((ing, index) => 
      ingredients.findIndex(other => other.ingredientId === ing.ingredientId) !== index
    )
    
    if (hasDuplicates) {
      toast({
        title: "Error",
        description: "No se pueden tener ingredientes duplicados",
        variant: "destructive"
      })
      return
    }

    onSave(ingredients)
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestión de Ingredientes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botón para agregar ingrediente */}
          <div className="flex justify-end">
            <Button onClick={addIngredient} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Ingrediente
            </Button>
          </div>

          {/* Lista de ingredientes */}
          <div className="space-y-3">
            {ingredients.map((ingredient, index) => (
              <Card key={`ingredient-${ingredient.ingredientId}-${index}`} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <Label htmlFor={`ingredient-${index}`}>Ingrediente</Label>
                    <ProductSearchSelect
                      products={availableIngredients}
                      selectedProduct={ingredient.ingredientId ? availableIngredients.find(ing => ing.id === ingredient.ingredientId) || null : null}
                      onProductSelect={(product) => handleProductSelect(index, product)}
                      placeholder="Buscar ingrediente..."
                      showStock={true}
                      showPrice={false}
                      showCategory={true}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`quantity-${index}`}>Cantidad</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                    inputMode="decimal"
                    lang="en"
                    pattern="^\\d*(?:[.,]\\d*)?$"
                    value={quantityInputs[index] || ""}
                    onChange={(e) => {
                      const raw = e.target.value
                      // Normalizar coma a punto y filtrar caracteres inválidos
                      let normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "")
                      // Permitir solo un punto decimal
                      normalized = normalized.replace(/(\..*)\./g, "$1")
                      updateIngredient(index, "quantity", normalized)
                    }}
                    onKeyDown={(evt) => {
                      // Bloquear signos y notación exponencial
                      if (["e", "E", "+", "-"].includes(evt.key)) {
                        evt.preventDefault()
                      }
                    }}
                      placeholder="0.50"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`unit-${index}`}>Unidad (opcional)</Label>
                    <Input
                      id={`unit-${index}`}
                      value={ingredient.unit || ""}
                      onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                      placeholder="litros, kg, etc."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {ingredient.ingredientName && (
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Stock actual:</strong> {ingredient.currentStock || 0} unidades
                  </div>
                )}
              </Card>
            ))}
          </div>

          {ingredients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay ingredientes agregados</p>
              <p className="text-sm">Haz clic en "Agregar Ingrediente" para comenzar</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Guardar Ingredientes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
