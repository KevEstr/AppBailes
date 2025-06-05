"use client"

import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function ClassesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Classes page error:", error)
  }, [error])

  return (
    <InternalLayout 
      title="Gestión de Clases" 
      description="Error al cargar"
    >
      <Card className="p-8 bg-gray-800/90 border-gray-600 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Error al cargar las clases</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Ha ocurrido un error al cargar la información de las clases. Intenta recargar la página.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={reset}
              className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </Card>
    </InternalLayout>
  )
} 