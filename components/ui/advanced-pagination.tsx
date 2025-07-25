import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface AdvancedPaginationProps {
  pagination: PaginationInfo
  currentPage: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  itemName?: string // e.g., "usuarios", "estudiantes"
  limitOptions?: number[]
}

export function AdvancedPagination({ 
  pagination, 
  currentPage, 
  onPageChange, 
  onLimitChange,
  itemName = "elementos",
  limitOptions = [5, 10, 20, 30, 50]
}: AdvancedPaginationProps) {
  
  if (pagination.totalCount === 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
      {/* Info */}
      <p className="text-gray-400 text-sm">
        Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} de {pagination.totalCount} {itemName}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="border-gray-600 text-gray-300 hidden sm:flex"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-gray-600 text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                if (pageNum <= pagination.totalPages && pageNum > 0) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      className={currentPage === pageNum 
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700" 
                        : "border-gray-600 text-gray-300 hover:bg-gray-700"}
                    >
                      {pageNum}
                    </Button>
                  );
                }
                return null;
              })}
            </div>

            {/* Current Page Indicator (Mobile) */}
            <span className="sm:hidden text-gray-300 min-w-[80px] text-center">
              {currentPage} / {pagination.totalPages}
            </span>

            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(pagination.totalPages, currentPage + 1))}
              disabled={currentPage === pagination.totalPages}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <span className="hidden sm:inline mr-1">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages}
              className="border-gray-600 text-gray-300 hidden sm:flex hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Mostrar:</span>
          <Select 
            value={pagination.limit.toString()}
            onValueChange={(value) => onLimitChange(parseInt(value))}
          >
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
