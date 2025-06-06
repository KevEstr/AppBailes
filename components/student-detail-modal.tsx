'use client'

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MapPin, Phone, Mail, IdCard, Heart, Calendar, DollarSign, UserCheck, AlertTriangle, Clock, GraduationCap, User } from "lucide-react"

interface StudentEnrollmentData {
  id: number
  documentType?: string
  birthDate?: string
  address?: string
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
  guardianName?: string
  guardianRelation?: string
  guardianPhone?: string
  monthlyFee?: number
  // Legacy fields for compatibility
  age?: number
  maritalStatus?: string
  emergencyContact?: string
  emergencyPhone?: string
  relationship?: string
  hasMedicalRestrictions?: boolean
  medicalRestrictions?: string
}

interface EnrollmentDetail {
  id: number
  studentId: number
  classId: number
  isActive: boolean
  enrolledAt: string
  createdAt: string
  student: {
    id: number
    name: string
    email?: string
    phone: string
    hasDebt: boolean
    isActive: boolean
    enrollmentData?: StudentEnrollmentData
    debts: Array<{
      id: number
      amount: number
      concept: string
      dueDate: string
    }>
    receipts: Array<{
      id: number
      amount: number
      concept: string
      createdAt: string
    }>
    attendances: Array<{
      id: number
      status: string
      date: string
      session?: {
        danceClass: {
          name: string
        }
      }
    }>
  }
  danceClass: {
    id: number
    name: string
    type: string
    price?: number
    trainer: {
      id: number
      name: string
    }
    location?: {
      id: number
      name: string
      address?: string
    }
    schedules: Array<{
      dayOfWeek: number
      startTime: string
      endTime: string
    }>
  }
}

interface StudentDetailModalProps {
  enrollment: {
    id: number
    student: {
      id: number
      name: string
      email?: string
      phone: string
      hasDebt: boolean
      isActive: boolean
    }
    danceClass: {
      name: string
      type: string
      trainer: {
        name: string
      }
      location?: {
        name: string
        address?: string
      }
    }
  }
}

export function StudentDetailModal({ enrollment }: StudentDetailModalProps) {
  const [detailData, setDetailData] = useState<EnrollmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        const studentId = enrollment.student.id
        const response = await fetch(`/api/students/${studentId}`)
        const data = await response.json()
        
        if (data.success && data.student) {
          // Create detail data structure from API response
          const detailData: EnrollmentDetail = {
            id: enrollment.id,
            studentId: data.student.id,
            classId: 0,
            isActive: true,
            enrolledAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            student: {
              id: data.student.id,
              name: data.student.name,
              email: data.student.email,
              phone: data.student.phone,
              hasDebt: enrollment.student.hasDebt,
              isActive: enrollment.student.isActive,
              enrollmentData: data.student.enrollmentData ? {
                ...data.student.enrollmentData,
                id: data.student.enrollmentData.id,
                hasMedicalRestrictions: data.student.enrollmentData.hasRestrictions || false,
                medicalRestrictions: data.student.enrollmentData.restrictionsDescription || data.student.enrollmentData.medicalConditions
              } : undefined,
              debts: [],
              receipts: [],
              attendances: []
            },
            danceClass: {
              id: 0,
              name: enrollment.danceClass.name,
              type: enrollment.danceClass.type,
              price: undefined,
              trainer: {
                id: 0,
                name: enrollment.danceClass.trainer.name
              },
              location: enrollment.danceClass.location ? {
                id: 0,
                name: enrollment.danceClass.location.name,
                address: enrollment.danceClass.location.address
              } : undefined,
              schedules: []
            }
          }
          setDetailData(detailData)
        } else {
          // Fallback to basic data
          const mockDetailData: EnrollmentDetail = {
            id: enrollment.id,
            studentId: enrollment.student.id,
            classId: 0,
            isActive: true,
            enrolledAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            student: {
              id: enrollment.student.id,
              name: enrollment.student.name,
              email: enrollment.student.email,
              phone: enrollment.student.phone,
              hasDebt: enrollment.student.hasDebt,
              isActive: enrollment.student.isActive,
              enrollmentData: undefined,
              debts: [],
              receipts: [],
              attendances: []
            },
            danceClass: {
              id: 0,
              name: enrollment.danceClass.name,
              type: enrollment.danceClass.type,
              price: undefined,
              trainer: {
                id: 0,
                name: enrollment.danceClass.trainer.name
              },
              location: enrollment.danceClass.location ? {
                id: 0,
                name: enrollment.danceClass.location.name,
                address: enrollment.danceClass.location.address
              } : undefined,
              schedules: []
            }
          }
          setDetailData(mockDetailData)
        }
      } catch (error) {
        console.error('Error fetching detail data:', error)
        // Fallback to basic data
        const mockDetailData: EnrollmentDetail = {
          id: enrollment.id,
          studentId: enrollment.student.id,
          classId: 0,
          isActive: true,
          enrolledAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          student: {
            id: enrollment.student.id,
            name: enrollment.student.name,
            email: enrollment.student.email,
            phone: enrollment.student.phone,
            hasDebt: enrollment.student.hasDebt,
            isActive: enrollment.student.isActive,
            enrollmentData: undefined,
            debts: [],
            receipts: [],
            attendances: []
          },
          danceClass: {
            id: 0,
            name: enrollment.danceClass.name,
            type: enrollment.danceClass.type,
            price: undefined,
            trainer: {
              id: 0,
              name: enrollment.danceClass.trainer.name
            },
            location: enrollment.danceClass.location ? {
              id: 0,
              name: enrollment.danceClass.location.name,
              address: enrollment.danceClass.location.address
            } : undefined,
            schedules: []
          }
        }
        setDetailData(mockDetailData)
      } finally {
        setLoading(false)
      }
    }
    fetchDetailData()
  }, [enrollment])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[dayOfWeek]
  }

  const getAttendanceStatusBadge = (status: string) => {
    const statusMap = {
      'PRESENT': { label: 'Asistió', className: 'bg-green-600' },
      'LATE': { label: 'Tardanza', className: 'bg-yellow-600' },
      'ABSENT': { label: 'Faltó', className: 'bg-red-600' },
      'CHANGE_REQUEST': { label: 'Cambio solicitado', className: 'bg-blue-600' }
    }
    const config = statusMap[status as keyof typeof statusMap] || { label: status, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const generateGoogleMapsUrl = (address: string) => {
    if (!address) return null
    const encodedAddress = encodeURIComponent(`${address}, Itagüí, Antioquia, Colombia`)
    return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodedAddress}`
  }

  const mapUrl = detailData?.student.enrollmentData?.address 
    ? generateGoogleMapsUrl(detailData.student.enrollmentData.address)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (!detailData) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No se pudieron cargar los detalles del estudiante.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header con información básica */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{detailData.student.name}</h2>
          <div className="flex items-center gap-4 mt-2 text-gray-300">
            <div className="flex items-center gap-1">
              <IdCard className="w-4 h-4" />
              <span>CC: {detailData.student.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{detailData.student.phone}</span>
            </div>
            {detailData.student.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span>{detailData.student.email}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Badge variant={detailData.student.isActive ? "default" : "secondary"} 
                 className={detailData.student.isActive ? "bg-green-600" : "bg-gray-600"}>
            {detailData.student.isActive ? "Activo" : "Inactivo"}
          </Badge>
          {detailData.student.hasDebt && (
            <Badge className="bg-red-600">
              Con deuda
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información Personal */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailData.student.enrollmentData ? (
              <>
                {detailData.student.enrollmentData.documentType && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo de documento:</span>
                    <span>{detailData.student.enrollmentData.documentType}</span>
                  </div>
                )}
                {detailData.student.enrollmentData.birthDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha de nacimiento:</span>
                    <span>{formatDate(detailData.student.enrollmentData.birthDate)}</span>
                  </div>
                )}
                {detailData.student.enrollmentData.bloodType && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Tipo de sangre:</span>
                    <Badge variant="outline" className="border-red-400 text-red-400">
                      <Heart className="w-3 h-3 mr-1" />
                      {detailData.student.enrollmentData.bloodType}
                    </Badge>
                  </div>
                )}
                {detailData.student.enrollmentData.eps && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">EPS:</span>
                    <span>{detailData.student.enrollmentData.eps}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">SISBEN:</span>
                  <Badge className={detailData.student.enrollmentData.hasSisben ? "bg-green-600" : "bg-gray-600"}>
                    {detailData.student.enrollmentData.hasSisben ? "Sí" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Estado:</span>
                  <Badge className={detailData.student.enrollmentData.isAdult !== false ? "bg-blue-600" : "bg-orange-600"}>
                    {detailData.student.enrollmentData.isAdult !== false ? "Mayor de edad" : "Menor de edad"}
                  </Badge>
                </div>
                <Separator className="bg-gray-700" />
                {(detailData.student.enrollmentData.emergencyContactName || detailData.student.enrollmentData.emergencyContact) && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contacto de emergencia:</span>
                      <span>{detailData.student.enrollmentData.emergencyContactName || detailData.student.enrollmentData.emergencyContact}</span>
                    </div>
                    {(detailData.student.enrollmentData.emergencyContactPhone || detailData.student.enrollmentData.emergencyPhone) && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Teléfono de emergencia:</span>
                        <span>{detailData.student.enrollmentData.emergencyContactPhone || detailData.student.enrollmentData.emergencyPhone}</span>
                      </div>
                    )}
                    {(detailData.student.enrollmentData.emergencyContactRelation || detailData.student.enrollmentData.relationship) && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Parentesco:</span>
                        <span>{detailData.student.enrollmentData.emergencyContactRelation || detailData.student.enrollmentData.relationship}</span>
                      </div>
                    )}
                  </>
                )}
                {detailData.student.enrollmentData.isAdult === false && (
                  <>
                    <Separator className="bg-gray-700" />
                    <div className="text-orange-400 font-medium text-sm">Información del Acudiente</div>
                    {detailData.student.enrollmentData.guardianName && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nombre del acudiente:</span>
                        <span>{detailData.student.enrollmentData.guardianName}</span>
                      </div>
                    )}
                    {detailData.student.enrollmentData.guardianRelation && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Relación:</span>
                        <span>{detailData.student.enrollmentData.guardianRelation}</span>
                      </div>
                    )}
                    {detailData.student.enrollmentData.guardianPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Teléfono del acudiente:</span>
                        <span>{detailData.student.enrollmentData.guardianPhone}</span>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-gray-500 italic">Información personal no registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Información de Clase */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Información de Clase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Clase:</span>
              <span>{detailData.danceClass.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tipo:</span>
              <Badge className={detailData.danceClass.type === 'DANCE' ? "bg-purple-600" : "bg-orange-600"}>
                {detailData.danceClass.type === 'DANCE' ? 'Baile' : 'Deporte'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Entrenador:</span>
              <span>{detailData.danceClass.trainer.name}</span>
            </div>
            {detailData.danceClass.price && (
              <div className="flex justify-between">
                <span className="text-gray-400">Precio:</span>
                <span className="font-semibold text-green-400">{formatCurrency(detailData.danceClass.price)}</span>
              </div>
            )}
            {detailData.danceClass.location && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ubicación:</span>
                  <span>{detailData.danceClass.location.name}</span>
                </div>
                {detailData.danceClass.location.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{detailData.danceClass.location.address}</span>
                  </div>
                )}
              </div>
            )}
            <Separator className="bg-gray-700" />
            <div className="flex justify-between">
              <span className="text-gray-400">Fecha de inscripción:</span>
              <span>{formatDate(detailData.enrolledAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Horarios */}
        {detailData.danceClass.schedules && detailData.danceClass.schedules.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horarios de Clase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {detailData.danceClass.schedules.map((schedule, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <span className="font-medium">{getDayName(schedule.dayOfWeek)}</span>
                    <span className="text-blue-300">{schedule.startTime} - {schedule.endTime}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información Médica */}
        {detailData.student.enrollmentData && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Información Médica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Restricciones médicas:</span>
                <Badge className={(detailData.student.enrollmentData.hasRestrictions || detailData.student.enrollmentData.hasMedicalRestrictions) ? "bg-red-600" : "bg-green-600"}>
                  {(detailData.student.enrollmentData.hasRestrictions || detailData.student.enrollmentData.hasMedicalRestrictions) ? "Sí" : "No"}
                </Badge>
              </div>
              {(detailData.student.enrollmentData.hasRestrictions || detailData.student.enrollmentData.hasMedicalRestrictions) && (
                <>
                  {(detailData.student.enrollmentData.restrictionsDescription || detailData.student.enrollmentData.medicalRestrictions) && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-red-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-400">Restricciones:</p>
                          <p className="text-sm text-gray-300 mt-1">{detailData.student.enrollmentData.restrictionsDescription || detailData.student.enrollmentData.medicalRestrictions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {detailData.student.enrollmentData.medicalConditions && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                      <div className="flex items-start gap-2">
                        <Heart className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-yellow-400">Condiciones médicas:</p>
                          <p className="text-sm text-gray-300 mt-1">{detailData.student.enrollmentData.medicalConditions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ubicación y Mapa */}
      {detailData.student.enrollmentData?.address && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ubicación del Estudiante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {detailData.student.enrollmentData.address && (
                  <div>
                    <span className="text-gray-400 text-sm">Dirección:</span>
                    <p className="text-white">{detailData.student.enrollmentData.address}</p>
                  </div>
                )}
                {detailData.student.enrollmentData.neighborhood && (
                  <div>
                    <span className="text-gray-400 text-sm">Barrio:</span>
                    <p className="text-white">{detailData.student.enrollmentData.neighborhood}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-sm">Ciudad:</span>
                  <p className="text-white">{detailData.student.enrollmentData.city || 'Itagüí'}</p>
                </div>
              </div>
              
              {mapUrl && !mapError && (
                <div className="mt-4">
                  <div className="aspect-video w-full">
                    <iframe
                      src={mapUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-lg"
                      onError={() => setMapError(true)}
                    />
                  </div>
                </div>
              )}
              
              {(mapError || !mapUrl) && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg text-center">
                  <MapPin className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-400">
                    {!mapUrl ? 'No se puede mostrar el mapa - API key no configurada' : 'Error al cargar el mapa'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const address = `${detailData.student.enrollmentData?.address}, Itagüí, Antioquia, Colombia`
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
                    }}
                  >
                    Abrir en Google Maps
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado Financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deudas */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Deudas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailData.student.debts && detailData.student.debts.length > 0 ? (
              <div className="space-y-3">
                {detailData.student.debts.map((debt) => (
                  <div key={debt.id} className="p-3 bg-red-900/20 border border-red-700 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-red-400">{debt.concept}</p>
                        <p className="text-sm text-gray-400">Vence: {formatDate(debt.dueDate)}</p>
                      </div>
                      <span className="font-bold text-red-400">{formatCurrency(debt.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <UserCheck className="w-8 h-8 mx-auto text-green-400 mb-2" />
                  <p className="text-green-400">Sin deudas pendientes</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Pagos */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Últimos Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailData.student.receipts && detailData.student.receipts.length > 0 ? (
              <div className="space-y-3">
                {detailData.student.receipts.map((receipt) => (
                  <div key={receipt.id} className="p-3 bg-green-900/20 border border-green-700 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-400">{receipt.concept}</p>
                        <p className="text-sm text-gray-400">{formatDate(receipt.createdAt)}</p>
                      </div>
                      <span className="font-bold text-green-400">{formatCurrency(receipt.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <p className="text-gray-400">No hay pagos registrados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Asistencias */}
      {detailData.student.attendances && detailData.student.attendances.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial de Asistencias (Últimas 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detailData.student.attendances.map((attendance) => (
                <div key={attendance.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <div>
                    <p className="text-white">{formatDate(attendance.date)}</p>
                    {attendance.session?.danceClass && (
                      <p className="text-sm text-gray-400">{attendance.session.danceClass.name}</p>
                    )}
                  </div>
                  {getAttendanceStatusBadge(attendance.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 