import { Card } from "@/components/ui/card"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function ReceiptsLoading() {
  return (
    <InternalLayout 
      title="Recibos" 
      description="Cargando..."
    >
      <div className="space-y-6">
        {/* Form skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-48 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
              <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-20 bg-gray-600 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-600 rounded-lg w-32 animate-pulse"></div>
          </div>
        </Card>

        {/* Recent receipts skeleton */}
        <Card className="p-6 bg-gray-800/90 border-gray-600">
          <div className="space-y-4">
            <div className="h-6 bg-gray-600 rounded w-40 animate-pulse"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-gray-600 rounded">
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-gray-600 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-600 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-gray-600 rounded w-20 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </InternalLayout>
  )
} 