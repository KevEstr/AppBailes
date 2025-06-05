import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface OptimizedLoaderProps {
  title?: string
  description?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const OptimizedLoader = memo(function OptimizedLoader({ 
  title = "Cargando...", 
  description = "Por favor espera un momento",
  className = "",
  size = 'md'
}: OptimizedLoaderProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16", 
    lg: "h-24 w-24"
  }
  
  const containerClasses = {
    sm: "p-6",
    md: "p-12",
    lg: "p-16"
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <Card className="border-0 shadow-2xl rounded-3xl bg-gray-800/90 border border-gray-600 backdrop-blur-sm">
        <CardContent className={`${containerClasses[size]} text-center`}>
          <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-blue-500 mx-auto mb-4`}></div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-300">{description}</p>
        </CardContent>
      </Card>
    </div>
  )
})

export const GridLoader = memo(function GridLoader({ 
  itemCount = 4,
  className = ""
}: { 
  itemCount?: number
  className?: string 
}) {
  return (
    <div className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <Card key={i} className="animate-pulse border-0 shadow-xl rounded-3xl bg-gray-800/80 border border-gray-600 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-600 rounded w-3/4"></div>
                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}) 