'use client'

import { InternalLayout } from "@/components/layouts/internal-layout"
import { EnrollmentForm } from '@/components/enrollment-form'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'

export default function EnrollmentPage() {
  const router = useRouter()

  return (
    <InternalLayout title="Nueva Inscripción">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-blue-400" />
                Nueva Inscripción
              </h1>
              <p className="text-gray-400 mt-1">
                Registra un nuevo estudiante en el sistema
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-xl">
              Formulario de Inscripción
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <EnrollmentForm />
          </CardContent>
        </Card>
      </div>
    </InternalLayout>
  )
} 