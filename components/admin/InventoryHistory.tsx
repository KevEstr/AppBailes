"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdvancedPagination } from "@/components/ui/advanced-pagination"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Package, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  TrendingDown,
  RotateCcw,
  Trash2
} from "lucide-react"

interface InventoryMovement {
  id: number
  productId: number
  movementType: string
  quantity: number
  reason: string | null
  reference: string | null
  notes: string | null
  processedBy: number
  createdAt: string
  product: {
    id: number
    name: string
    category: string
    productType: string
  }
  user: {
    id: number
    email: string
  }
}

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function InventoryHistory() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(20)

  useEffect(() => {
    loadMovements()
  }, [currentPage, movementTypeFilter, productFilter, dateFrom, dateTo, limit])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(1)
        loadMovements()
      } else if (searchTerm === "") {
        loadMovements()
      }
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm])

  const loadMovements = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchTerm,
        movementType: movementTypeFilter !== "all" ? movementTypeFilter : "",
        productId: productFilter !== "all" ? productFilter : "",
        dateFrom,
        dateTo
      })

      const response = await fetch(`/api/admin/inventory/movements/history?${params}`)
      const data = await response.json()

      if (data.success) {
        setMovements(data.movements)
        setPagination(data.pagination)
      } else {
        setError(data.error || "Error al cargar movimientos")
      }
    } catch (error) {
      console.error("Error loading movements:", error)
      setError("Error de conexión al cargar movimientos")
    } finally {
      setIsLoading(false)
    }
  }

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: "Compra",
      SALE: "Venta",
      ADJUSTMENT: "Ajuste",
      WASTE: "Desperdicio",
      TRANSFER: "Transferencia",
      RETURN: "Devolución"
    }
    return labels[type] || type
  }

  const getReasonLabel = (reason: string) => {
    const reasonLabels: Record<string, string> = {
      PURCHASE: "Compra",
      ADJUSTMENT: "Ajuste de Inventario",
      WASTE: "Pérdida/Desperdicio",
      TRANSFER: "Transferencia",
      RETURN: "Devolución",
      SALE: "Venta"
    }
    return reasonLabels[reason] || reason
  }

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PURCHASE: "bg-green-900/30 text-green-300 border border-green-600/30",
      SALE: "bg-red-900/30 text-red-300 border border-red-600/30",
      ADJUSTMENT: "bg-blue-900/30 text-blue-300 border border-blue-600/30",
      WASTE: "bg-orange-900/30 text-orange-300 border border-orange-600/30",
      TRANSFER: "bg-purple-900/30 text-purple-300 border border-purple-600/30",
      RETURN: "bg-cyan-900/30 text-cyan-300 border border-cyan-600/30"
    }
    return colors[type] || "bg-gray-800 text-gray-300 border border-gray-600/50"
  }

  const getMovementIcon = (type: string) => {
    const icons: Record<string, any> = {
      PURCHASE: ArrowUp,
      SALE: ArrowDown,
      ADJUSTMENT: RotateCcw,
      WASTE: Trash2,
      TRANSFER: TrendingUp,
      RETURN: TrendingDown
    }
    return icons[type] || Package
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatQuantity = (quantity: number) => {
    return quantity > 0 ? `+${quantity}` : quantity.toString()
  }

  const getQuantityColor = (quantity: number) => {
    return quantity > 0 ? "text-green-400" : "text-red-400"
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setMovementTypeFilter("all")
    setProductFilter("all")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Historial de Movimientos</h2>
          <p className="text-gray-300 mt-1">Registro de todas las entradas y salidas de inventario</p>
        </div>
        <Button
          onClick={clearFilters}
          variant="outline"
          className="border-gray-600 text-gray-200"
        >
          Limpiar Filtros
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-900/30 border border-red-700 text-red-300">
          {error}
        </div>
      )}

      {/* Filtros */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>

            <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="PURCHASE">Compra</SelectItem>
                <SelectItem value="SALE">Venta</SelectItem>
                <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                <SelectItem value="WASTE">Desperdicio</SelectItem>
                <SelectItem value="TRANSFER">Transferencia</SelectItem>
                <SelectItem value="RETURN">Devolución</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Fecha desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />

            <Input
              type="date"
              placeholder="Fecha hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de movimientos */}
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white">Movimientos de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          )}
          {!isLoading && movements.length === 0 && (
            <div className="text-center py-8 text-gray-400">No se encontraron movimientos</div>
          )}
          {!isLoading && movements.length > 0 && (
            <div className="space-y-4">
              {movements.map((movement) => {
                const IconComponent = getMovementIcon(movement.movementType)
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-gray-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{movement.product.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getMovementTypeColor(movement.movementType)}>
                            {getMovementTypeLabel(movement.movementType)}
                          </Badge>
                          <Badge variant="outline" className="text-gray-300 border-gray-600">
                            {movement.product.productType === "COMPOSITE" ? "Compuesto" : "Simple"}
                          </Badge>
                        </div>
                        {movement.reason && (
                          <p className="text-sm text-gray-300 mt-1">Motivo: {getReasonLabel(movement.reason)}</p>
                        )}
                        {movement.reference && (
                          <p className="text-sm text-gray-400">Ref: {movement.reference}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`font-semibold text-lg ${getQuantityColor(movement.quantity)}`}>
                          {formatQuantity(movement.quantity)}
                        </div>
                        <div className="text-sm text-gray-300">
                          {formatDate(movement.createdAt)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Por: {movement.user.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <AdvancedPagination
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="movimientos"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InventoryHistory
