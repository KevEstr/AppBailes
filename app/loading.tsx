import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-xl rounded-3xl bg-gray-800/80 border border-gray-600 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-600 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Loading indicator */}
        <div className="fixed bottom-8 right-8">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-600">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <span className="text-white font-medium">Cargando Paradise...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 