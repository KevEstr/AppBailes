import { Card } from "@/components/ui/card"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function AttendanceLoading() {
  return (
    <InternalLayout 
      title="Asistencia de Estudiantes" 
      description="Cargando..."
    >
      <div className="space-y-6">
        {/* Filters skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
          </div>
        </Card>

        {/* Students grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="p-4 bg-gray-800/90 border-gray-600">
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                <div className="h-8 bg-gray-600 rounded-lg animate-pulse"></div>
                <div className="flex justify-between">
                  <div className="h-6 bg-gray-600 rounded w-16 animate-pulse"></div>
                  <div className="h-6 bg-gray-600 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-8 bg-gray-600 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
} 