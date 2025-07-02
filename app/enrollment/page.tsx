'use client'

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

import { InternalLayout } from "@/components/layouts/internal-layout"
import { EnrollmentForm } from '@/components/enrollment-form'
import { UserPlus } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function EnrollmentPage() {
  return (
    <InternalLayout title="Formulario de Inscripción">
      <div className="h-full w-full">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
          <UserPlus className="w-7 h-7 text-blue-400" />
          Formulario de Inscripción
        </h1>
        <div className="text-center">
            <p className="text-gray-300 text-sm leading-relaxed">
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
    </InternalLayout>
  )
} 