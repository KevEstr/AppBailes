"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdvancedPagination } from "@/components/ui/advanced-pagination"
import { ProductModal } from "@/components/admin/ProductModal"
import { InventoryMovementModal } from "@/components/admin/InventoryMovementModal"
import { InventoryHistory } from "@/components/admin/InventoryHistory"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  History,
  Download
} from "lucide-react"

interface Ingredient {
  id?: number
  ingredientId: number
  ingredientName: string
  quantity: number
  unit?: string
  currentStock?: number
}

interface Product {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  category: string
  productType: "SIMPLE" | "COMPOSITE"
  allowNegativeStock: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  compositeIngredients?: Array<{
    id: number
    quantity: number
    unit?: string
    ingredient: {
      id: number
      name: string
      stock: number
    }
  }>
}

interface ProductStats {
  totalProducts: number
  activeProducts: number
  inactiveProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalStockValue: number
  categoryBreakdown: Array<{
    category: string
    count: number
    totalStock: number
  }>
}

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [inventoryModalType, setInventoryModalType] = useState<"ENTRY" | "EXIT">("ENTRY")
  const [activeTab, setActiveTab] = useState("products")
  const [error, setError] = useState("")

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
	const [stockFilter, setStockFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    loadProducts()
    loadStats()
	}, [currentPage, categoryFilter, statusFilter, stockFilter, limit])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(1)
        loadProducts()
      } else if (searchTerm === "") {
        loadProducts()
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
		const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        category: categoryFilter !== "all" ? categoryFilter : "",
        search: searchTerm
      })

		if (statusFilter !== "all") {
        params.set("active", statusFilter === "active" ? "true" : "false")
      }

		// Filtro de stock
		if (stockFilter !== "all") {
			params.set("stock", stockFilter === "low" ? "LOW" : "OUT")
		}

      const response = await fetch(`/api/admin/products?${params}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.products)
        setPagination(data.pagination)
      } else {
        setError(data.error || "Error al cargar productos")
      }
    } catch (error) {
      console.error("Error loading products:", error)
      setError("Error de conexión al cargar productos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/products/stats")
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const handleExportProductsExcel = async () => {
    try {
      setIsDownloading(true)
      const response = await fetch(`/api/admin/products/export-excel`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al exportar productos")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const contentDisposition = response.headers.get("content-disposition")
      let filename = "productos.xlsx"
      if (contentDisposition) {
        const filenameRegex = /filename=\"(.+)\"/
        const match = filenameRegex.exec(contentDisposition)
        if (match) filename = match[1]
      }
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast({ title: "✅ Archivo descargado", description: `Archivo ${filename} descargado exitosamente` })
    } catch (err) {
      console.error("Error downloading products Excel file:", err)
      toast({ title: "❌ Error", description: err instanceof Error ? err.message : "Error al descargar archivo Excel", variant: "destructive" })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCreateProduct = () => {
    setSelectedProduct(null)
    setShowProductModal(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowProductModal(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteDialog(true)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      const response = await fetch(`/api/admin/products/${productToDelete.id}`, {
        method: "DELETE"
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Producto eliminado",
          description: "El producto ha sido eliminado exitosamente",
        })
        loadProducts()
        loadStats()
      } else {
        setError(data.error || "Error al eliminar producto")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      setError("Error de conexión al eliminar producto")
    } finally {
      setShowDeleteDialog(false)
      setProductToDelete(null)
    }
  }

  const handleProductSaved = async (productData: any) => {
    try {
      setIsModalLoading(true)
      const url = productData.id 
        ? `/api/admin/products/${productData.id}`
        : "/api/admin/products"
      const method = productData.id ? "PUT" : "POST"
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(productData)
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: productData.id ? "Producto actualizado" : "Producto creado",
          description: data.message || "Operación exitosa",
        })
        setShowProductModal(false)
        loadProducts()
        loadStats()
      } else {
        setError(data.error || "Error al guardar producto")
      }
    } catch (error) {
      console.error("Error saving product:", error)
      setError("Error de conexión al guardar producto")
    } finally {
      setIsModalLoading(false)
    }
  }

  const handleCloseModal = () => {
    setShowProductModal(false)
    setSelectedProduct(null)
    setError("")
  }


  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setCurrentPage(1)
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      JUICES: "Jugos Naturales",
      SNACKS: "Snacks",
      BEVERAGES: "Bebidas",
      FOOD: "Comida",
      UNIFORMS: "Uniformes",
      ACCESSORIES: "Accesorios",
      ADDITIONS: "Adiciones",
      OTHER: "Otros"
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      JUICES: "bg-orange-900/30 text-orange-300 border border-orange-600/30",
      SNACKS: "bg-yellow-900/30 text-yellow-300 border border-yellow-600/30",
      BEVERAGES: "bg-blue-900/30 text-blue-300 border border-blue-600/30",
      FOOD: "bg-green-900/30 text-green-300 border border-green-600/30",
      UNIFORMS: "bg-purple-900/30 text-purple-300 border border-purple-600/30",
      ACCESSORIES: "bg-cyan-900/30 text-cyan-300 border border-cyan-600/30",
      ADDITIONS: "bg-pink-900/30 text-pink-300 border border-pink-600/30",
      OTHER: "bg-gray-800 text-gray-300 border border-gray-600/50"
    }
    return colors[category] || "bg-gray-800 text-gray-300 border border-gray-600/50"
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Administración de Productos</h1>
          <p className="text-gray-300 mt-1">Gestiona el inventario de productos y snacks</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleCreateProduct}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
          <Button
            onClick={() => {
              setInventoryModalType("ENTRY")
              setShowInventoryModal(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            Entrada Inventario
          </Button>
          <Button
            onClick={() => {
              setInventoryModalType("EXIT")
              setShowInventoryModal(true)
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Salida Inventario
          </Button>
        </div>
      </div>

      {/* Pestañas */}
      <div className="border-b border-gray-600">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("products")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "products"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Productos
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "history"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            Historial de Movimientos
          </button>
        </nav>
      </div>

      {/* Contenido de la pestaña de Productos */}
      {activeTab === "products" && (
        <>
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-800/90 border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Total Productos</CardTitle>
                  <Package className="h-4 w-4 text-gray-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalProducts}</div>
                  <p className="text-xs text-gray-400">{stats.activeProducts} activos</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/90 border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Valor Inventario</CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{formatPrice(stats.totalStockValue)}</div>
                  <p className="text-xs text-gray-400">Valor total en stock</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/90 border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Stock Bajo</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-gray-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">{stats.lowStockProducts}</div>
                  <p className="text-xs text-gray-400">Menos de 10 unidades</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/90 border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Sin Stock</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">{stats.outOfStockProducts}</div>
                  <p className="text-xs text-gray-400">Necesitan reposición</p>
                </CardContent>
              </Card>
            </div>
          )}

      {error && (
        <div className="p-3 rounded-md bg-red-900/30 border border-red-700 text-red-300">
          {error}
        </div>
      )}

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
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="JUICES">Jugos Naturales</SelectItem>
                <SelectItem value="SNACKS">Snacks</SelectItem>
                <SelectItem value="BEVERAGES">Bebidas</SelectItem>
                <SelectItem value="FOOD">Comida</SelectItem>
                <SelectItem value="UNIFORMS">Uniformes</SelectItem>
                <SelectItem value="ACCESSORIES">Accesorios</SelectItem>
                <SelectItem value="ADDITIONS">Adiciones</SelectItem>
                <SelectItem value="OTHER">Otros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

			{/* Filtro de Stock + Exportar */}
			<div className="flex gap-2">
				<Select value={stockFilter} onValueChange={setStockFilter}>
					<SelectTrigger className="w-full sm:w-[180px] bg-gray-700 border-gray-600 text-white">
						<SelectValue placeholder="Stock" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todo el stock</SelectItem>
						<SelectItem value="low">Stock bajo (&lt; 10)</SelectItem>
						<SelectItem value="out">Sin stock</SelectItem>
					</SelectContent>
				</Select>
				<Button
					onClick={handleExportProductsExcel}
					variant="outline"
					className="border-green-600 text-green-400"
					disabled={isDownloading}
					title="Exportar todos los productos"
				>
					{isDownloading ? (
						<>
							<div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-2" />
							Descargando...
						</>
					) : (
						<>
							<Download className="h-4 w-4 mr-2" /> Exportar Excel
						</>
					)}
				</Button>
			</div>
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
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {/* Mobile-first responsive layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Product image and basic info */}
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{product.name}</h3>
                        {/* Badges - responsive wrapping */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <Badge className={`${getCategoryColor(product.category)} text-xs`}>
                            {getCategoryLabel(product.category)}
                          </Badge>
                          <Badge variant={product.productType === "COMPOSITE" ? "outline" : "default"} className="text-xs">
                            {product.productType === "COMPOSITE" ? "Compuesto" : "Simple"}
                          </Badge>
                          <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                            {product.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        {/* Ingredients - only show on larger screens to save space */}
                        {product.productType === "COMPOSITE" && product.compositeIngredients && product.compositeIngredients.length > 0 && (
                          <div className="mt-2 text-xs text-gray-400 hidden sm:block">
                            <strong>Ingredientes:</strong> {product.compositeIngredients.map(ing => 
                              `${ing.ingredient.name} (${ing.quantity}${ing.unit || ''})`
                            ).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price and actions - responsive layout */}
                    <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-4 sm:gap-2">
                      <div className="text-left sm:text-right">
                        <div className="font-semibold text-white text-lg">{formatPrice(product.price)}</div>
                        {product.productType === "SIMPLE" ? (
                          <div className="text-sm text-gray-300">Stock: {product.stock}</div>
                        ) : (
                          <div className="text-sm text-gray-300">Producto Compuesto</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)} className="border-gray-600 text-gray-200">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product)} className="text-red-400 hover:text-red-300 border-gray-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients for mobile - show at bottom on small screens */}
                  {product.productType === "COMPOSITE" && product.compositeIngredients && product.compositeIngredients.length > 0 && (
                    <div className="mt-3 text-xs text-gray-400 sm:hidden">
                      <strong>Ingredientes:</strong> {product.compositeIngredients.map(ing => 
                        `${ing.ingredient.name} (${ing.quantity}${ing.unit || ''})`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <AdvancedPagination
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="productos"
            />
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Contenido de la pestaña de Historial */}
      {activeTab === "history" && (
        <InventoryHistory />
      )}

      {showProductModal && (
        <ProductModal
          isOpen={showProductModal}
          product={selectedProduct}
          isLoading={isModalLoading}
          onSave={handleProductSaved}
          onClose={handleCloseModal}
        />
      )}

      {showInventoryModal && (
        <InventoryMovementModal
          isOpen={showInventoryModal}
          movementType={inventoryModalType}
          onClose={() => setShowInventoryModal(false)}
          onSuccess={() => {
            // Recargar datos después de un movimiento exitoso
            loadProducts()
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto <strong>{productToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ProductsManagement


