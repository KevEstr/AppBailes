'use client'

import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth-guard"
import EditStudentModal from "@/components/edit-student-modal"
import { MapPin, Phone, Mail, IdCard, Heart, Calendar, DollarSign, UserCheck, AlertTriangle, GraduationCap, User, Edit, Camera, CheckCircle, Trophy } from "lucide-react"
import { ProfilePhotoModal } from "@/components/profile/ProfilePhotoModal"

interface StudentData {
  id: string
  name: string
  phone: string
  avatar?: string
  user: {
    email: string
  }
  enrollmentData?: {
    id: number
    documentType?: string
    birthDate?: string
    address?: string
    addressLatitude?: number
    addressLongitude?: number
    neighborhood?: string
    city?: string
    hasSisben?: boolean
    eps?: string
    bloodType?: string
    hasRestrictions?: boolean
    restrictionsDescription?: string
    medicalConditions?: string
    isAdult?: boolean
    emergencyContactName?: string
    emergencyContactRelation?: string
    emergencyContactPhone?: string
    // Guardian fields removed - using emergency contact instead
    monthlyFee?: number
    jerseyNumber?: number
  }
  classEnrollments?: any[]
}

function StudentContent() {
  const [student, setStudent] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [imageKey, setImageKey] = useState(0)

  useEffect(() => {
    loadStudentProfile()
  }, [])

  const loadStudentProfile = async () => {
    try {
      const response = await fetch("/api/students/profile", {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        // Si es 404, mostrar mensaje específico
        if (response.status === 404) {
          setError("No se encontró el perfil del estudiante. Contacta al administrador.")
        } else {
          setError(`Error del servidor: ${response.status}`)
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setStudent(data.student)
      } else {
        setError(data.error || "Error al cargar el perfil")
      }
    } catch (err) {
      console.error("Error loading student profile:", err)
      setError("Error de conexión al cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const handleStudentUpdated = () => {
    loadStudentProfile()
    setImageKey(prev => prev + 1) // Forzar recarga de imagen
    setSuccessMessage('Información actualizada exitosamente')
    
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)
  }

  const getDocumentTypeLabel = (type?: string) => {
    if (!type) return 'No especificado'
    
    const typeMap = {
      'CC': 'Cédula de Ciudadanía',
      'TI': 'Tarjeta de Identidad',
      'RC': 'Registro Civil',
      'CE': 'Cédula de Extranjería',
      'PEP': 'Permiso Especial de Permanencia'
    }
    
    return typeMap[type as keyof typeof typeMap] || type
  }

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return ''
    
    console.log('Formatting date for input:', dateString)
    
    // Si ya está en formato YYYY-MM-DD, devolverlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Intentar convertir otros formatos comunes
    try {
      // Manejar formato DD/MM/YYYY o D/M/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/')
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        console.log('Converted DD/MM/YYYY format:', dateString, '->', formattedDate)
        return formattedDate
      }
      
      // Manejar formato DD-MM-YYYY o D-M-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('-')
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        console.log('Converted DD-MM-YYYY format:', dateString, '->', formattedDate)
        return formattedDate
      }
      
      // Manejar formato YYYY/MM/DD
      if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('/')
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        console.log('Converted YYYY/MM/DD format:', dateString, '->', formattedDate)
        return formattedDate
      }
      
      // Intentar convertir con Date (solo como último recurso)
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toISOString().split('T')[0]
        console.log('Converted using Date constructor:', dateString, '->', formattedDate)
        return formattedDate
      }
    } catch (error) {
      console.error('Error formatting date:', error)
    }
    
    console.log('Could not format date, returning empty string for:', dateString)
    return ''
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificada'
    
    try {
      let date: Date
      
      // Si está en formato DD/MM/YYYY o D/M/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/')
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      // Si está en formato YYYY-MM-DD
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        date = new Date(dateString)
      }
      // Otros formatos, intentar con Date constructor
      else {
        date = new Date(dateString)
      }
      
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    } catch (error) {
      console.error('Error formatting date for display:', error)
    }
    
    return 'Fecha inválida'
  }

  const generateGoogleMapsUrl = (enrollmentData: any) => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return null
    
    // Si tenemos coordenadas, usar esas
    if (enrollmentData.addressLatitude && enrollmentData.addressLongitude) {
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${enrollmentData.addressLatitude},${enrollmentData.addressLongitude}&zoom=16`
    }
    
    // Si no tenemos coordenadas pero sí dirección, usar la dirección
    if (enrollmentData.address) {
      const encodedAddress = encodeURIComponent(`${enrollmentData.address}, Itagüí, Antioquia, Colombia`)
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodedAddress}`
    }
    
    return null
  }

  const mapUrl = student?.enrollmentData 
    ? generateGoogleMapsUrl(student.enrollmentData)
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Cargando perfil...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <Card className="bg-red-900/20 border-red-600">
          <CardContent className="p-6 text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={loadStudentProfile} variant="outline" className="mr-2">
              Reintentar
            </Button>
            <Button onClick={handleSignOut} variant="destructive">
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Mi Perfil</h1>
          <div className="flex gap-2">
            {student && (
              <Button 
                onClick={() => setIsEditModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Perfil
              </Button>
            )}
            <Button onClick={handleSignOut} variant="outline">
               Cerrar Sesión
             </Button>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="flex items-center gap-2 text-green-300">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {student && (
          <div className="space-y-6">
            {/* Header Principal */}
            <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative group">
                                         {student.avatar ? (
                       <img
                         key={imageKey}
                         src={`${student.avatar}?t=${Date.now()}&v=${imageKey}`}
                         alt={`Foto de ${student.name}`}
                         className="w-16 h-16 rounded-full object-cover border-2 border-slate-600"
                       />
                     ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </div>
                    )}
                    
                    <ProfilePhotoModal
                      studentId={student.id}
                      currentPhotoUrl={student.avatar}
                                             onSuccess={(newPhotoUrl: string) => {
                         setStudent(prev => prev ? {
                           ...prev,
                           avatar: newPhotoUrl
                         } : null);
                         setImageKey(prev => prev + 1); // Forzar recarga de imagen
                       }}
                      customTrigger={
                        <button
                          className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Cambiar foto de perfil"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-white">{student.name}</h2>
                    <p className="text-slate-300">ID: {student.id}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-600 hover:bg-green-700 text-white border-0">
                    Activo
                  </Badge>
                </div>
              </div>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Información Personal */}
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-emerald-400 flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Información Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-blue-400" />
                    <div>
                      <span className="text-slate-400">Email:</span>
                      <p className="text-white font-medium">{student.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-green-400" />
                    <div>
                      <span className="text-slate-400">Teléfono:</span>
                      <p className="text-white font-medium">{student.phone}</p>
                    </div>
                  </div>
                  {student.enrollmentData?.documentType && (
                    <div className="flex items-center gap-3">
                      <IdCard className="h-4 w-4 text-yellow-400" />
                      <div>
                        <span className="text-slate-400">Documento:</span>
                        <p className="text-white font-medium">
                          {getDocumentTypeLabel(student.enrollmentData.documentType)} - {student.id}
                        </p>
                      </div>
                    </div>
                  )}
                  {student.enrollmentData?.birthDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-purple-400" />
                      <div>
                        <span className="text-slate-400">Fecha de Nacimiento:</span>
                        <p className="text-white font-medium">
                          {formatDate(student.enrollmentData.birthDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {student.enrollmentData?.city && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-red-400" />
                      <div>
                        <span className="text-slate-400">Ciudad:</span>
                        <p className="text-white font-medium">{student.enrollmentData.city}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información Médica */}
              {student.enrollmentData && (
                <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
                      <Heart className="h-5 w-5" />
                      Información Médica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {student.enrollmentData.eps && (
                      <div>
                        <span className="text-slate-400">EPS:</span>
                        <p className="text-white font-medium">{student.enrollmentData.eps}</p>
                      </div>
                    )}
                    {student.enrollmentData.bloodType && (
                      <div>
                        <span className="text-slate-400">Tipo de Sangre:</span>
                        <p className="text-white font-medium">{student.enrollmentData.bloodType}</p>
                      </div>
                    )}
                    {student.enrollmentData.hasRestrictions && (
                      <div>
                        <span className="text-slate-400">Restricciones Médicas:</span>
                        <p className="text-white font-medium">
                          {student.enrollmentData.restrictionsDescription || 'Sí, ver detalles'}
                        </p>
                      </div>
                    )}
                    {student.enrollmentData.medicalConditions && (
                      <div>
                        <span className="text-slate-400">Condiciones Médicas:</span>
                        <p className="text-white font-medium">{student.enrollmentData.medicalConditions}</p>
                      </div>
                    )}
                    {student.enrollmentData.hasSisben !== undefined && (
                      <div>
                        <span className="text-slate-400">Tiene SISBEN:</span>
                        <p className="text-white font-medium">
                          {student.enrollmentData.hasSisben ? 'Sí' : 'No'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Contacto de Emergencia */}
            {student.enrollmentData?.emergencyContactName && (
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-yellow-400 flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5" />
                    Contacto de Emergencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Nombre:</span>
                    <p className="text-white font-medium">{student.enrollmentData.emergencyContactName}</p>
                  </div>
                  {student.enrollmentData.emergencyContactRelation && (
                    <div>
                      <span className="text-slate-400">Relación:</span>
                      <p className="text-white font-medium">{student.enrollmentData.emergencyContactRelation}</p>
                    </div>
                  )}
                  {student.enrollmentData.emergencyContactPhone && (
                    <div>
                      <span className="text-slate-400">Teléfono:</span>
                      <p className="text-white font-medium">{student.enrollmentData.emergencyContactPhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Información del Acudiente/Contacto de Emergencia */}
            {student.enrollmentData?.emergencyContactName && (
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-orange-400 flex items-center gap-2 text-lg">
                    <UserCheck className="h-5 w-5" />
                    {!student.enrollmentData?.isAdult ? 'Información del Acudiente' : 'Contacto de Emergencia'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Nombre:</span>
                    <p className="text-white font-medium">{student.enrollmentData.emergencyContactName}</p>
                  </div>
                  {student.enrollmentData.emergencyContactRelation && (
                    <div>
                      <span className="text-slate-400">Relación:</span>
                      <p className="text-white font-medium">{student.enrollmentData.emergencyContactRelation}</p>
                    </div>
                  )}
                  {student.enrollmentData.emergencyContactPhone && (
                    <div>
                      <span className="text-slate-400">Teléfono:</span>
                      <p className="text-white font-medium">{student.enrollmentData.emergencyContactPhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ubicación */}
            {student.enrollmentData?.address && (
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Ubicación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Dirección:</span>
                      <p className="text-white font-medium">{student.enrollmentData.address}</p>
                    </div>
                    {student.enrollmentData.neighborhood && (
                      <div>
                        <span className="text-slate-400">Barrio:</span>
                        <p className="text-white font-medium">{student.enrollmentData.neighborhood}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Ciudad:</span>
                      <p className="text-white font-medium">{student.enrollmentData.city}</p>
                    </div>
                  </div>
                  
                  {mapUrl && !mapError && (
                    <div className="w-full h-64 rounded-lg overflow-hidden">
                      <iframe
                        src={mapUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Ubicación del estudiante"
                        onError={() => setMapError(true)}
                      />
                    </div>
                  )}
                  
                  {(mapError || !mapUrl) && (
                    <div className="w-full h-32 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                      <div className="text-center">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p>Mapa no disponible</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Información Financiera */}
            {student.enrollmentData?.monthlyFee && (
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-blue-400 flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    Información Financiera
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div>
                    <span className="text-slate-400">Mensualidad:</span>
                    <p className="text-white font-medium text-lg">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP'
                      }).format(student.enrollmentData.monthlyFee)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información Deportiva */}
            {student.enrollmentData?.jerseyNumber && (
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-yellow-400 flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5" />
                    Información Deportiva
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div>
                    <span className="text-slate-400">Número de Camiseta:</span>
                    <p className="text-white font-medium text-lg">
                      #{student.enrollmentData.jerseyNumber}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mis Clases */}
            {student.classEnrollments && student.classEnrollments.length > 0 && (
              <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
                <CardHeader className="pb-4">
                  <CardTitle className="text-purple-400 flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Mis Clases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {student.classEnrollments.map((enrollment, index) => (
                      <div key={`enrollment-${enrollment.id || index}`} className="p-4 bg-slate-700/50 rounded-lg">
                        <p className="text-white font-medium text-lg">
                          {enrollment.danceClass?.name || "Clase sin nombre"}
                        </p>
                        {enrollment.danceClass?.type && (
                          <p className="text-slate-400 text-sm">
                            Tipo: {enrollment.danceClass.type}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modal de Edición */}
        {student && (
          <EditStudentModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            student={{
              id: student.id,
              name: student.name,
              email: student.user?.email,
              phone: student.phone,
              avatar: student.avatar || '',
              documentNumber: student.id,
              documentType: (() => {
                const type = student.enrollmentData?.documentType || 'CC'
                // Mapear texto completo a código si es necesario
                const mapping: { [key: string]: string } = {
                  'Cédula de Ciudadanía': 'CC',
                  'Tarjeta de Identidad': 'TI',
                  'Registro Civil': 'RC',
                  'Cédula de Extranjería': 'CE',
                  'Permiso Especial de Permanencia': 'PEP'
                }
                return mapping[type] || type
              })(),
              birthDate: formatDateForInput(student.enrollmentData?.birthDate || ''),
              address: student.enrollmentData?.address || '',
              addressLatitude: student.enrollmentData?.addressLatitude,
              addressLongitude: student.enrollmentData?.addressLongitude,
              neighborhood: student.enrollmentData?.neighborhood || '',
              city: student.enrollmentData?.city || 'Itagüí',
              hasSisben: student.enrollmentData?.hasSisben || false,
              eps: student.enrollmentData?.eps || '',
              bloodType: student.enrollmentData?.bloodType || '',
              hasRestrictions: student.enrollmentData?.hasRestrictions || false,
              restrictionsDescription: student.enrollmentData?.restrictionsDescription || '',
              medicalConditions: student.enrollmentData?.medicalConditions || '',
              isAdult: student.enrollmentData?.isAdult ?? true,
              emergencyContactName: student.enrollmentData?.emergencyContactName || '',
              emergencyContactRelation: student.enrollmentData?.emergencyContactRelation || '',
              emergencyContactPhone: student.enrollmentData?.emergencyContactPhone || '',
              // Guardian fields removed - using emergency contact instead
              jerseyNumber: student.enrollmentData?.jerseyNumber || undefined
            }}
            onStudentUpdated={handleStudentUpdated}
          />
        )}
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <AuthGuard requiredRole="STUDENT">
      <StudentContent />
    </AuthGuard>
  )
}
