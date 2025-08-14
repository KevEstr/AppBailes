"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AdvancedPagination } from "@/components/ui/advanced-pagination"
import { ProductSellModal } from "@/components/sales/ProductSellModal"
import { Search } from "lucide-react"

interface ProductItem {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  category: string
  isActive: boolean
}

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function ProductsSales() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 12, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(12)

  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [showSellModal, setShowSellModal] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [currentPage, limit, categoryFilter])

  useEffect(() => {
    const h = setTimeout(() => {
      setCurrentPage(1)
      loadProducts()
    }, 400)
    return () => clearTimeout(h)
  }, [searchTerm])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        category: categoryFilter !== "all" ? categoryFilter : "",
        search: searchTerm,
        active: "true",
      })
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
        setPagination(data.pagination)
      } else {
        setError(data.error || "Error al cargar productos")
      }
    } catch (e) {
      setError("Error de conexión al cargar productos")
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value)

  const openSellModal = (product: ProductItem) => {
    setSelectedProduct(product)
    setShowSellModal(true)
  }

  const closeSellModal = () => {
    setShowSellModal(false)
    setSelectedProduct(null)
  }

  const handleSaleCompleted = () => {
    loadProducts()
  }

  const categoryOptions = useMemo(() => ([
    { value: "all", label: "Todas" },
    { value: "JUICES", label: "Jugos Naturales" },
    { value: "SNACKS", label: "Snacks" },
    { value: "BEVERAGES", label: "Bebidas" },
    { value: "FOOD", label: "Comida" },
    { value: "OTHER", label: "Otros" },
  ]), [])

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/90 border-gray-600">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          )}
          {!isLoading && products.length === 0 && (
            <div className="text-center py-8 text-gray-400">No se encontraron productos</div>
          )}
          {!isLoading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                  <div className="w-full h-40 bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-300">Sin imagen</div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-white font-semibold">{p.name}</div>
                      {p.description && <div className="text-sm text-gray-300 line-clamp-2">{p.description}</div>}
                      <div className="text-sm text-gray-300 mt-1">Stock: {p.stock}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">{formatPrice(p.price)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => openSellModal(p)}>
                      Vender
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <AdvancedPagination
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onLimitChange={(newLimit) => { setLimit(newLimit); setCurrentPage(1) }}
              itemName="productos"
            />
          )}
        </CardContent>
      </Card>

      {showSellModal && selectedProduct && (
        <ProductSellModal
          isOpen={showSellModal}
          product={{ id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, stock: selectedProduct.stock, imageUrl: selectedProduct.imageUrl }}
          onClose={closeSellModal}
          onCompleted={handleSaleCompleted}
        />
      )}
    </div>
  )
}

export default ProductsSales


