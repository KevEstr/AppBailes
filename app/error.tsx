"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function GlbError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="border-0 bg-gray-800/95 shadow-2xl rounded-3xl border border-gray-600 max-w-md backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-red-400">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">¡Oops! Algo salió mal</h2>
              <p className="text-gray-300 mb-6">
                Ocurrió un error inesperado en Paradise Dance Academy. 
                No te preocupes, estamos trabajando para solucionarlo.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={reset}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de nuevo
                </Button>
                
                <Link href="/">
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Volver al inicio
                  </Button>
                </Link>
              </div>
              
              <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                <p className="text-xs text-gray-400">
                  Error ID: {error.digest || "UNKNOWN"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 