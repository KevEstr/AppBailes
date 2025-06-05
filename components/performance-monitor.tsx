"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react"

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'loading' | 'success' | 'error'
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Monitorear las llamadas fetch de forma optimizada
  useEffect(() => {
    // Solo activar en desarrollo y cuando el monitor esté visible
    if (process.env.NODE_ENV !== 'development') return

    const originalFetch = window.fetch

    window.fetch = async function(...args) {
      const url = args[0].toString()
      const metricName = url.includes('/api/') ? url.split('/api/')[1] : url
      
      const metric: PerformanceMetric = {
        name: metricName,
        startTime: performance.now(),
        status: 'loading'
      }

      // Solo actualizar si el monitor está visible para reducir re-renders
      if (isVisible) {
        setMetrics(prev => [...prev.slice(-9), metric]) // Mantener solo los últimos 10
      }

      try {
        const result = await originalFetch.apply(this, args)
        const endTime = performance.now()
        
        if (isVisible) {
          setMetrics(prev => prev.map(m => 
            m === metric 
              ? { 
                  ...m, 
                  endTime, 
                  duration: endTime - m.startTime,
                  status: result.ok ? 'success' : 'error' 
                }
              : m
          ))
        }

        return result
      } catch (error) {
        const endTime = performance.now()
        
        if (isVisible) {
          setMetrics(prev => prev.map(m => 
            m === metric 
              ? { 
                  ...m, 
                  endTime, 
                  duration: endTime - m.startTime,
                  status: 'error' 
                }
              : m
          ))
        }

        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [isVisible])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return 'bg-yellow-950/50 text-yellow-400 border-yellow-500'
      case 'success': return 'bg-green-950/50 text-green-400 border-green-500'
      case 'error': return 'bg-red-950/50 text-red-400 border-red-500'
      default: return 'bg-gray-950/50 text-gray-400 border-gray-500'
    }
  }

  const getDurationColor = (duration?: number) => {
    if (!duration) return 'text-gray-400'
    if (duration < 500) return 'text-green-400'
    if (duration < 2000) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white backdrop-blur-sm"
      >
        <Activity className="w-4 h-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-hidden z-50 border border-gray-600 shadow-2xl bg-gray-800/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-white">Performance Monitor</span>
          </div>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {metrics.length === 0 ? (
          <p className="text-sm text-gray-400">No hay métricas aún...</p>
        ) : (
          metrics.slice().reverse().map((metric, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-700/80 rounded text-xs border border-gray-600">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getStatusIcon(metric.status)}
                <span className="truncate font-medium text-gray-200">
                  {metric.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`text-xs border ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </Badge>
                {metric.duration && (
                  <span className={`font-mono ${getDurationColor(metric.duration)}`}>
                    {metric.duration.toFixed(0)}ms
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Resumen */}
        <div className="border-t border-gray-600 pt-2 mt-3">
          <div className="text-xs text-gray-400">
            <div>Total llamadas: {metrics.length}</div>
            <div>Promedio: {metrics.length > 0 ? (
              metrics
                .filter(m => m.duration)
                .reduce((acc, m) => acc + (m.duration || 0), 0) / 
              metrics.filter(m => m.duration).length
            ).toFixed(0) : 0}ms</div>
            <div className="text-red-400">
              Lentas (&gt;2s): {metrics.filter(m => (m.duration || 0) > 2000).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 