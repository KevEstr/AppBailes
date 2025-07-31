'use client'

import { EnrollmentForm } from '@/components/enrollment-form'
import { UserPlus } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function EnrollmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container px-2 py-2 sm:px-6 sm:py-6 mx-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center gap-3 mb-4">
              <UserPlus className="w-7 h-7 text-blue-400" />
              Formulario de Inscripción
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Diligenciando este formulario, me comprometo con el Club a estar afiliado en la permanencia 
              del tiempo de entrenamiento al SISBEN o EPS, y además me comprometo a pagar el derecho de 
              afiliación y el aporte mensual cumplidamente.
              <br /><br />
              El Club Paradise se compromete a manejar la información acá suministrada con el mayor 
              cuidado y únicamente con fines deportivos.
            </p>
          </div>
          
          <Separator className="my-4 sm:my-6 bg-gray-600" />
          <EnrollmentForm />
        </div>
      </div>
    </div>
  )
} 