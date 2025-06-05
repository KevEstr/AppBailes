import { Card } from "@/components/ui/card"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function MessagesLoading() {
  return (
    <InternalLayout 
      title="Notificaciones" 
      description="Cargando..."
    >
      <div className="space-y-6">
        {/* Message form skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-56 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
              <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="flex justify-end">
              <div className="h-10 bg-gray-600 rounded-lg w-32 animate-pulse"></div>
            </div>
          </div>
        </Card>

        {/* Message history skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-48 animate-pulse"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 border border-gray-600 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-4 bg-gray-600 rounded w-40 animate-pulse"></div>
                    <div className="h-3 bg-gray-600 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-600 rounded w-32 animate-pulse mb-2"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-600 rounded w-3/4 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
} 