"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Product {
  id: number
  name: string
  price: number
  stock?: number | null
  productType: "SIMPLE" | "COMPOSITE"
  category: string
}

interface ProductSearchSelectProps {
  products: Product[]
  selectedProduct: Product | null
  onProductSelect: (product: Product) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showStock?: boolean
  showPrice?: boolean
  showCategory?: boolean
}

export function ProductSearchSelect({
  products,
  selectedProduct,
  onProductSelect,
  placeholder = "Buscar producto...",
  disabled = false,
  className,
  showStock = true,
  showPrice = true,
  showCategory = true
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtrar productos basado en el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleProductSelect = (product: Product) => {
    onProductSelect(product)
    setSearchTerm("")
    setIsOpen(false)
  }

  const handleClear = () => {
    onProductSelect(null as any)
    setSearchTerm("")
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
  }

  return (
    <div className={cn("relative", className)}>
      {/* Input de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {selectedProduct && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Producto seleccionado */}
      {selectedProduct && (
        <div className="mt-2 p-3 bg-gray-800 border border-gray-600 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-400" />
              <span className="font-medium text-white">{selectedProduct.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown de resultados */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-gray-400">
              No se encontraron productos
            </div>
          ) : (
            <div className="py-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleProductSelect(product)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none text-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{product.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
