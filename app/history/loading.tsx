import { Card } from "@/components/ui/card"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function HistoryLoading() {
  return (
    <InternalLayout 
      title="Análisis" 
      description="Cargando..."
    >
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 bg-gray-800/90 border-gray-600">
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-600 rounded w-16 animate-pulse"></div>
                <div className="h-3 bg-gray-600 rounded w-32 animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Chart skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-48 animate-pulse"></div>
            <div className="h-80 bg-gray-600 rounded-lg animate-pulse"></div>
          </div>
        </Card>

        {/* Table skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-56 animate-pulse"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4">
                  <div className="h-10 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-600 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
} 