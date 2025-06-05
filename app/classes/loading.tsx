import { Card } from "@/components/ui/card"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function ClassesLoading() {
  return (
    <InternalLayout 
      title="Gestión de Clases" 
      description="Cargando..."
    >
      <div className="space-y-6">
        {/* Header skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-600 rounded-lg w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-600 rounded-lg w-32 animate-pulse"></div>
          </div>
        </Card>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <Card className="p-6 bg-gray-800/90 border-gray-600">
            <div className="space-y-4">
              <div className="h-6 bg-gray-600 rounded w-32 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-600 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </Card>

          {/* Right column */}
          <Card className="p-6 bg-gray-800/90 border-gray-600">
            <div className="space-y-4">
              <div className="h-6 bg-gray-600 rounded w-40 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-600 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Table skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-48 animate-pulse"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-600 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
} 