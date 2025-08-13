import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Upload, Image as ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Product {
  id?: number
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  category: string
  isActive: boolean
}

interface ProductModalProps {
  readonly isOpen: boolean
  readonly product: Product | null
  readonly isLoading: boolean
  readonly onSave: (product: Product) => void
  readonly onClose: () => void
}

export function ProductModal({ isOpen, product, isLoading, onSave, onClose }: ProductModalProps) {
  const [formData, setFormData] = useState<Product>({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    imageUrl: "",
    category: "SNACKS",
    isActive: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name,
        description: product.description || "",
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl || "",
        category: product.category,
        isActive: product.isActive
      })
      setImagePreviewUrl(product.imageUrl || null)
      setImageFile(null)
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        imageUrl: "",
        category: "SNACKS",
        isActive: true
      })
      setImagePreviewUrl(null)
      setImageFile(null)
    }
    setErrors({})
  }, [product, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio"
    }

    if (formData.price <= 0) {
      newErrors.price = "El precio debe ser mayor a 0"
    }

    if (formData.stock < 0) {
      newErrors.stock = "El stock no puede ser negativo"
    }

    if (!formData.category) {
      newErrors.category = "La categoría es obligatoria"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    try {
      let imageUrlToUse = formData.imageUrl || ""

      if (imageFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('image', imageFile)
        const uploadRes = await fetch('/api/upload/product-image', {
          method: 'POST',
          body: fd
        })
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}))
          toast({ title: 'Error al subir imagen', description: err.message || 'No se pudo subir la imagen' })
          setUploading(false)
          return
        }
        const { url } = await uploadRes.json()
        imageUrlToUse = url
        setUploading(false)
      }

      onSave({ ...formData, imageUrl: imageUrlToUse })
    } finally {
      // no-op
    }
  }

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  const handleSelectImage = (file: File | null) => {
    if (!file) {
      setImageFile(null)
      setImagePreviewUrl(null)
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowed.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Solo JPG y PNG' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 5MB' })
      return
    }
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    if (errors.imageUrl) {
      setErrors(prev => ({ ...prev, imageUrl: "" }))
    }
  }

  // No se requiere getCategoryLabel aquí actualmente

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gray-800/95 border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {product ? "Editar Producto" : "Crear Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-200">Nombre del Producto *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Ej: Jugo de Naranja Natural"
              className={`bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 ${errors.name ? "border-red-500" : ""}`}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción opcional del producto..."
              rows={3}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-200">Precio *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 ${errors.price ? "border-red-500" : ""}`}
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="text-gray-200">Stock *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange("stock", parseInt(e.target.value) || 0)}
                placeholder="0"
                className={`bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 ${errors.stock ? "border-red-500" : ""}`}
              />
              {errors.stock && (
                <p className="text-sm text-red-500">{errors.stock}</p>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-gray-200">Categoría *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange("category", value)}
            >
              <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${errors.category ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JUICES">Jugos Naturales</SelectItem>
                <SelectItem value="SNACKS">Snacks</SelectItem>
                <SelectItem value="BEVERAGES">Bebidas</SelectItem>
                <SelectItem value="FOOD">Comida</SelectItem>
                <SelectItem value="OTHER">Otros</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Imagen del producto - subida de archivo */}
          <div className="space-y-2">
            <Label className="text-gray-200">Imagen del producto</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-700 border border-gray-600 flex items-center justify-center">
                {imagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md cursor-pointer border border-gray-600">
                  <Upload className="w-4 h-4" />
                  <span>{imageFile ? 'Cambiar imagen' : 'Subir imagen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSelectImage(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">JPG o PNG, máximo 5MB</p>
              </div>
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange("isActive", checked)}
            />
            <Label htmlFor="isActive" className="text-gray-200">Producto Activo</Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-600 text-gray-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || uploading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {(isLoading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Actualizar" : "Crear"} Producto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
