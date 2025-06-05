import { Card } from "@/components/ui/card"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function DebtsLoading() {
  return (
    <InternalLayout 
      title="Control Pagos" 
      description="Cargando..."
    >
      <div className="space-y-6">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 bg-gray-800/90 border-gray-600">
              <div className="space-y-2">
                <div className="h-4 bg-gray-600 rounded w-20 animate-pulse"></div>
                <div className="h-6 bg-gray-600 rounded w-12 animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
          </div>
        </Card>

        {/* Debts table skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-40 animate-pulse"></div>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 p-3 border border-gray-600 rounded">
                  <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-600 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
} 