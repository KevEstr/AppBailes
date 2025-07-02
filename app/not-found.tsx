"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="border-0 bg-gray-800/95 shadow-2xl rounded-3xl border border-gray-600 max-w-md backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center border-2 border-purple-500">
                <Search className="w-12 h-12 text-white" />
              </div>
              
              <h1 className="text-6xl font-bold text-white mb-4">404</h1>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                Página no encontrada
              </h2>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                Lo sentimos, la página que buscas no existe en Paradise Dance Academy. 
                Puede que haya sido movida o el enlace esté roto.
              </p>
              
              <div className="space-y-3">
                <Link href="/" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3">
                    <Home className="w-4 h-4 mr-2" />
                    Ir al inicio
                  </Button>
                </Link>
                
                <Button 
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl py-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver atrás
                </Button>
              </div>
              
              <div className="mt-8 text-xs text-gray-400">
                <p>¿Necesitas ayuda? Contacta con Paradise Dance Academy</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 