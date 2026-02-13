"use client"

import { useState, useEffect } from "react"
import { 
  User, 
  MapPin, 
  Heart, 
  UserCheck, 
  GraduationCap,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle,
  Trophy,
  Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { InteractiveMap } from './interactive-map'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { isValidPhoneFormat } from "@/lib/phone-utils"
import { ProfilePhotoModal } from "@/components/profile/ProfilePhotoModal"

// Función de utilidad para validar y formatear números de teléfono
const validateAndFormatPhone = (value: string): string => {
  // Remover todos los caracteres que no sean números
  const numbersOnly = value.replace(/\D/g, '')
  
  // Limitar a 10 dígitos
  return numbersOnly.slice(0, 10)
}


// === Utilidades de validación adicionales ===
const validateAndFormatDocumentNumber = (value: string): string => {
  // Solo permitir números
  return value.replace(/\D/g, '')
}

const isValidEmailFormat = (value: string): boolean => {
  // Validación simple de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  return emailRegex.test(value)
}

const validateAndFormatFullName = (value: string): string => {
  // Permitir letras A-Z, ñ/Ñ, tildes y espacios. Quitar números y caracteres especiales, y colapsar espacios múltiples
  return value
    .replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ ]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
}

const isValidFullName = (value: string): boolean => {
  if (!value) return false
  // Al menos dos letras, solo letras (incluyendo ñ/Ñ, tildes) y espacios, sin caracteres especiales ni números
  return /^[A-Za-záéíóúÁÉÍÓÚñÑ ]{10,}$/.test(value.trim())
}

const isValidBirthDate = (value: string): boolean => {
  if (!value) return false
  const date = new Date(value)
  const today = new Date()
  // Normalizar horas para comparar solo fecha
  date.setHours(0,0,0,0)
  today.setHours(0,0,0,0)
  return date <= today
}

// (Se reutiliza isValidFullName para validar nombres de contacto y acudiente)



interface EnrollmentFormData {
  // Selección de clase
  sport: 'DANCE' | 'VOLLEYBALL'
  trainerId: number | null
  locationId: number | null
  classId: number | null
  
  // Información básica del estudiante (para tabla Student)
  studentId: string // Cédula que será el ID
  studentName: string
  email: string
  phone: string
  profilePhotoUrl?: string
  
  // Información detallada (para tabla StudentEnrollmentData)
  documentType: string
  birthDate: string
  address: string
  addressLatitude?: number
  addressLongitude?: number
  neighborhood: string
  city: string
  hasSisben: boolean
  eps: string
  bloodType: string
  hasRestrictions: boolean
  restrictionsDescription?: string
  medicalConditions?: string
  isAdult: boolean
  
  // Contacto de emergencia
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactPhone: string
  
  
  // Términos
  acceptsTerms: boolean
}

interface TrainerInfo {
  id: number
  name: string
  email: string
}

interface LocationInfo {
  id: number
  name: string
  address?: string
}

interface ClassInfo {
  id: number
  name: string
  description?: string
  sport: string
  level: string
  capacity: number
  price?: number
  trainer: TrainerInfo
  location?: LocationInfo
  schedules: Array<{
    id: number
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
}

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "TI", label: "Tarjeta de Identidad" }, 
  { value: "RC", label: "Registro Civil" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PEP", label: "Permiso Especial de Permanencia" }
]

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

const RELATIONS = [
  { value: "padre", label: "Padre" },
  { value: "madre", label: "Madre" },
  { value: "abuelo", label: "Abuelo(a)" },
  { value: "tio", label: "Tío(a)" },
  { value: "hermano", label: "Hermano(a)" },
  { value: "otro", label: "Otro" }
]

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function EnrollmentForm() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Dynamic data states
  const [trainers, setTrainers] = useState<TrainerInfo[]>([])
  const [locations, setLocations] = useState<LocationInfo[]>([])
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState<EnrollmentFormData>({
    sport: '' as 'DANCE' | 'VOLLEYBALL',
    trainerId: null,
    locationId: null,
    classId: null,
    studentId: '',
    studentName: '',
    email: '',
    phone: '',
    profilePhotoUrl: '',
    documentType: '',
    birthDate: '',
    address: '',
    neighborhood: '',
    city: '',
    hasSisben: false,
    eps: '',
    bloodType: '',
    hasRestrictions: false,
    isAdult: true,
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    acceptsTerms: false
  })

  // Estado para el nombre del archivo de la foto
  const [photoFileName, setPhotoFileName] = useState<string>('')

  const totalSteps = 5

  // Load trainers for DANCE
  const loadTrainers = async () => {
    try {
      setLoadingData(true)
      const response = await fetch('/api/enrollment/trainers?sport=DANCE')
      const data = await response.json()
      
      if (data.success) {
        setTrainers(data.trainers)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los profesores",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading trainers:', error)
      toast({
        title: "Error",
        description: "Error al cargar los profesores",
        variant: "destructive"
      })
    } finally {
      setLoadingData(false)
    }
  }

  // Load locations for VOLLEYBALL
  const loadLocations = async () => {
    try {
      setLoadingData(true)
      const response = await fetch('/api/enrollment/locations?sport=VOLLEYBALL')
      const data = await response.json()
      
      if (data.success) {
        setLocations(data.locations)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las ubicaciones",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading locations:', error)
      toast({
        title: "Error",
        description: "Error al cargar las ubicaciones",
        variant: "destructive"
      })
    } finally {
      setLoadingData(false)
    }
  }

  // Load classes/schedules based on sport and selection
  const loadSchedules = async () => {
    if (formData.sport === 'DANCE' && !formData.trainerId) return
    if (formData.sport === 'VOLLEYBALL' && !formData.locationId) return

    try {
      setLoadingData(true)
      
      let url = `/api/enrollment/schedules?sport=${formData.sport}`
      if (formData.sport === 'DANCE') {
        url += `&trainerId=${formData.trainerId}`
      } else {
        url += `&locationId=${formData.locationId}`
      }

      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setAvailableClasses(data.classes)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los horarios",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast({
        title: "Error",
        description: "Error al cargar los horarios",
        variant: "destructive"
      })
    } finally {
      setLoadingData(false)
    }
  }

  // Load initial data when sport changes
  useEffect(() => {
    if (formData.sport === 'DANCE') {
      loadTrainers()
      setLocations([])
      setFormData(prev => ({ ...prev, locationId: null, trainerId: null, classId: null }))
    } else {
      loadLocations()
      setTrainers([])
      setFormData(prev => ({ ...prev, trainerId: null, locationId: null, classId: null }))
    }
    setAvailableClasses([])
    setSelectedClass(null)
  }, [formData.sport])

  // Load schedules when trainer or location changes
  useEffect(() => {
    if (formData.trainerId || formData.locationId) {
      loadSchedules()
      setFormData(prev => ({ ...prev, classId: null }))
      setSelectedClass(null)
    } else {
      setAvailableClasses([])
    }
  }, [formData.trainerId, formData.locationId])

  // Update selected class when classId changes
  useEffect(() => {
    if (formData.classId) {
      const foundClass = availableClasses.find(c => c.id === formData.classId)
      setSelectedClass(foundClass || null)
    } else {
      setSelectedClass(null)
    }
  }, [formData.classId, availableClasses])

  // Unificado a un solo contacto con etiqueta dinámica (sin sincronización con acudiente)
  // Nota: UI muestra un solo bloque y se valida siempre el mismo conjunto de campos

  const updateFormData = (field: keyof EnrollmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const submitForm = async () => {
    setLoading(true)
    try {
      // Verificar solo por número de documento
      const checkResponse = await fetch(`/api/students/check?documentNumber=${formData.studentId}`)
      const checkData = await checkResponse.json()
      console.log(checkData)
      if (checkData.exists) {
        toast({
          title: "❌ Estudiante ya registrado",
          description: "Ya existe un estudiante inscrito con este número de documento. Si crees que esto es un error, por favor contacta al administrador.",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Si el documento no existe, proceder con la inscripción
      const apiData = {
        ...formData,
        documentNumber: formData.studentId,
        classId: formData.classId
      }
      
      delete (apiData as any).studentId

      const response = await fetch('/api/enrollments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Inscripción exitosa",
          description: `¡Bienvenido ${formData.studentName}!`,
          variant: "default"
        })
        
        // Reset form
        setFormData({
          sport: '' as 'DANCE' | 'VOLLEYBALL',
          trainerId: null,
          locationId: null,
          classId: null,
          studentId: '',
          studentName: '',
          email: '',
          phone: '',
          documentType: '',
          birthDate: '',
          address: '',
          neighborhood: '',
          city: '',
          hasSisben: false,
          eps: '',
          bloodType: '',
          hasRestrictions: false,
          isAdult: true,
          emergencyContactName: '',
          emergencyContactRelation: '',
          emergencyContactPhone: '',
          acceptsTerms: false
        })
        setPhotoFileName('')
        setSelectedClass(null)
        setCurrentStep(1)
      } else {
        toast({
          title: "❌ Error en la inscripción",
          description: data.error || "No se pudo completar la inscripción. Por favor, intenta nuevamente.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error en la inscripción:', error)
      toast({
        title: "❌ Error de conexión",
        description: "Hubo un problema al procesar tu solicitud. Por favor, verifica tu conexión e intenta nuevamente.",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.classId
      case 2:
        // Solo validar que los campos estén completos, no su unicidad
        return !!(
          formData.studentName && isValidFullName(formData.studentName) &&
          formData.studentId && 
          formData.documentType && 
          formData.birthDate && isValidBirthDate(formData.birthDate) &&
          formData.email && isValidEmailFormat(formData.email) && 
          formData.phone &&
          isValidPhoneFormat(formData.phone) &&
          formData.profilePhotoUrl
        )
      case 3:
        return !!(
          formData.city && 
          formData.neighborhood && 
          formData.address && 
          formData.eps && 
          formData.bloodType
        )
      case 4:
        return !!(
          formData.emergencyContactName &&
          isValidFullName(formData.emergencyContactName) &&
          formData.emergencyContactRelation &&
          formData.emergencyContactPhone &&
          isValidPhoneFormat(formData.emergencyContactPhone)
        )
      case 5:
        return formData.acceptsTerms
      default:
        return true
    }
  }

  // Función auxiliar para obtener el texto del nivel
  const getLevelText = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'Principiante'
      case 'INTERMEDIATE':
        return 'Intermedio'
      case 'ADVANCED':
        return 'Avanzado'
      default:
        return level
    }
  }

  const renderScheduleContent = () => {
    if (loadingData) {
      return (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-400 text-sm">Cargando...</span>
        </div>
      )
    }

    if (availableClasses.length === 0) {
      return (
        <div className="text-center py-4 text-gray-400">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay horarios disponibles</p>
        </div>
      )
    }

    return (
      <Select 
        value={formData.classId?.toString() || ''}
        onValueChange={(value) => updateFormData('classId', value ? parseInt(value) : null)}
      >
        <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2 min-h-[2.5rem] h-auto">
          <SelectValue placeholder="Selecciona tu horario">
            {selectedClass && (
              <div className="flex flex-col w-full">
                <span className="truncate font-medium">{selectedClass.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
          {availableClasses.map((classInfo) => (
            <SelectItem key={classInfo.id} value={classInfo.id.toString()} className="w-full">
              <div className="flex flex-col w-full pr-2">
                <span className="text-sm">{classInfo.name}</span>
                {formData.sport === 'VOLLEYBALL' && classInfo.trainer && (
                  <span className="text-xs text-gray-400 truncate">
                    Profesor: {classInfo.trainer.name}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Sport Selection */}
                <div>
              <Label className="text-white font-medium mb-2 block">Tipo de Actividad *</Label>
                  <Select 
                value={formData.sport}
                onValueChange={(value: 'DANCE' | 'VOLLEYBALL') => updateFormData('sport', value)}
                  >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                  <SelectValue placeholder="Selecciona una actividad" />
                    </SelectTrigger>
                    <SelectContent>
                  <SelectItem value="DANCE">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      <span className="truncate">Baile Urbano</span>
                    </div>
                        </SelectItem>
                  <SelectItem value="VOLLEYBALL">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span className="truncate">Voleibol</span>
                    </div>
                  </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

            {/* Professor/Location Selection - Solo mostrar si hay un deporte seleccionado */}
            {formData.sport && (
              formData.sport === 'DANCE' ? (
                  <div>
                  <Label className="text-white font-medium mb-2 block">Profesor con el que bailas *</Label>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                      <span className="ml-2 text-gray-400 text-sm">Cargando...</span>
                    </div>
                  ) : (
                    <Select 
                      value={formData.trainerId?.toString() || ''}
                      onValueChange={(value) => updateFormData('trainerId', value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                        <SelectValue placeholder="Selecciona tu profesor" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                        {trainers.map((trainer) => (
                          <SelectItem key={trainer.id} value={trainer.id.toString()} className="w-full">
                            <div className="flex items-center gap-2 w-full pr-4">
                              <User className="h-4 w-4 text-purple-400 flex-shrink-0" />
                              <span className="truncate">{trainer.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                )}
              </div>
              ) : (
                <div>
                  <Label className="text-white font-medium mb-2 block">Cancha en la que entrenas *</Label>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-gray-400 text-sm">Cargando...</span>
                    </div>
                  ) : (
                  <Select 
                      value={formData.locationId?.toString() || ''}
                      onValueChange={(value) => updateFormData('locationId', value ? parseInt(value) : null)}
                  >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                        <SelectValue placeholder="Selecciona la cancha" />
                    </SelectTrigger>
                      <SelectContent className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                      {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()} className="w-full">
                            <div className="flex items-center gap-2 w-full pr-4">
                              <MapPin className="h-4 w-4 text-green-400 flex-shrink-0" />
                              <span className="truncate">{location.name}</span>
                            </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </div>
              )
            )}

            {/* Schedule Selection */}
            {(formData.trainerId || formData.locationId) && (
                  <div>
                <Label className="text-white font-medium mb-2 block">
                  Grupo y horario *
                </Label>
                {renderScheduleContent()}
              </div>
            )}

            {/* Selected Class Summary */}
            {selectedClass && (
              <div className="bg-gray-800/50 border-gray-600 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium text-sm mb-2">Clase seleccionada:</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-400">{selectedClass.name}</p>
                      <p className="text-gray-400">Profesor: {selectedClass.trainer.name}</p>
                      {selectedClass.location && (
                        <p className="text-gray-400">Cancha: {selectedClass.location.name}</p>
                      )}
                      <p className="text-gray-400">Nivel: {getLevelText(selectedClass.level)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            {/* Resumen de clase seleccionada */}
            {selectedClass && (
              <div className="bg-gray-800/50 border-gray-600 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{selectedClass.name}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {selectedClass.trainer.name}
                      {selectedClass.location && ` • ${selectedClass.location.name}`}
                    </p>
                </div>
              </div>
            </div>
            )}

            {/* Formulario de información personal */}
            <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-600">
              {/* Primera línea: Nombre y Fecha de Nacimiento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentName" className="text-white font-medium text-sm">
                    Nombre Completo del Participante *
                  </Label>
                  <Input
                    id="studentName"
                    placeholder="Nombres y apellidos del participante"
                    value={formData.studentName}
                    onChange={(e) => updateFormData('studentName', validateAndFormatFullName(e.target.value))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                  {formData.studentName && !isValidFullName(formData.studentName) && (
                    <p className="text-red-400 text-xs mt-1">
                      Solo letras y espacios, mínimo 10 caracteres
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="birthDate" className="text-white font-medium text-sm">
                    Fecha de Nacimiento del Participante *
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => {
                      const nextVal = e.target.value
                      const birthDate = new Date(nextVal)
                      const today = new Date()
                      const age = today.getFullYear() - birthDate.getFullYear()
                      const adult = age >= 18
                      updateFormData('birthDate', nextVal)
                      updateFormData('isAdult', adult)
                    }}
                    className={`bg-gray-800 border-gray-600 text-white mt-1 ${formData.birthDate && !isValidBirthDate(formData.birthDate) ? 'border-red-500 focus:border-red-500' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {formData.birthDate && !isValidBirthDate(formData.birthDate) && (
                    <p className="text-red-400 text-xs mt-1">La fecha no puede ser futura</p>
                  )}
                </div>
              </div>

              {/* Segunda línea: Foto, Tipo de Documento y Número de Documento */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white font-medium text-sm">Foto de Perfil del Participante *</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-3">
                      <ProfilePhotoModal
                        uploadOnly
                        currentPhotoUrl={formData.profilePhotoUrl || undefined}
                        onSuccess={(url: string) => {
                          updateFormData('profilePhotoUrl', url)
                          // Extraer el nombre del archivo de la URL
                          const fileName = url.split('/').pop() || ''
                          setPhotoFileName(fileName)
                        }}
                        onError={(message: string) => {
                          toast({
                            title: 'Error al subir la foto',
                            description: message,
                            variant: 'destructive'
                          })
                        }}
                        triggerText={formData.profilePhotoUrl ? 'Cambiar foto' : 'Subir foto'}
                      />
                      {photoFileName && (
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-xs truncate" title={photoFileName}>
                            {photoFileName}
                          </p>
                        </div>
                      )}
                    </div>
                    {!formData.profilePhotoUrl && (
                      <p className="text-red-400 text-xs">Debes subir una foto de perfil para continuar</p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                      Si la subida falla o se queda cargando, revisa tu conexión a internet e intenta de nuevo.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="documentType" className="text-white font-medium text-sm">
                    Tipo de Documento del Participante *
                  </Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => updateFormData('documentType', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="studentId" className="text-white font-medium text-sm">
                    Número de Documento del Participante *
                  </Label>
                  <Input
                    id="studentId"
                    placeholder="Número de documento del participante"
                    value={formData.studentId}
                    onChange={(e) => updateFormData('studentId', validateAndFormatDocumentNumber(e.target.value))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Tercera línea: Email y Teléfono */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-white font-medium text-sm">
                    Email del Participante *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com del participante"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className={`bg-gray-800 border-gray-600 text-white mt-1 ${formData.email && !isValidEmailFormat(formData.email) ? 'border-red-500 focus:border-red-500' : formData.email && isValidEmailFormat(formData.email) ? 'border-green-500 focus:border-green-500' : ''}`}
                  />
                  {formData.email && !isValidEmailFormat(formData.email) && (
                    <p className="text-red-400 text-xs mt-1">Ingresa un correo válido</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white font-medium text-sm">
                    Teléfono del Participante *
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      placeholder="3001234567"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', validateAndFormatPhone(e.target.value))}
                      className={`bg-gray-800 border-gray-600 text-white mt-1 pr-10 ${
                        formData.phone && !isValidPhoneFormat(formData.phone) 
                          ? 'border-red-500 focus:border-red-500' 
                          : formData.phone && isValidPhoneFormat(formData.phone)
                          ? 'border-green-500 focus:border-green-500'
                          : ''
                      }`}
                    />
                    {formData.phone && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {isValidPhoneFormat(formData.phone) ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.phone && !isValidPhoneFormat(formData.phone) && (
                    <p className="text-red-400 text-xs mt-1">
                      El teléfono debe tener exactamente 10 dígitos
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-600">
              <div className="col-span-full flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Ubicación</h3>
                  </div>

                  <div>
                <Label className="text-white">Ciudad *</Label>
                    <Input
                  value={formData.city}
                  placeholder="Ej: Bello"
                  onChange={(e) => updateFormData('city', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                    />
                  </div>

              <div className="lg:col-span-2">
                <Label htmlFor="neighborhood" className="text-white">Barrio *</Label>
                    <Input
                      id="neighborhood"
                  placeholder="Ej: Mesa"
                      value={formData.neighborhood}
                      onChange={(e) => updateFormData('neighborhood', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                    />
                </div>

              <div className="col-span-full">
                  <InteractiveMap
                    address={formData.address}
                    latitude={formData.addressLatitude}
                    longitude={formData.addressLongitude}
                    onAddressChange={(address) => updateFormData('address', address)}
                    onCoordinatesChange={(lat, lng) => {
                      updateFormData('addressLatitude', lat)
                      updateFormData('addressLongitude', lng)
                    }}
                  />
                </div>
            </div>

            {/* Información Médica */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-600">
              <div className="col-span-full flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Información Médica del Participante</h3>
                  </div>

              <div className="lg:col-span-2">
                <Label htmlFor="eps" className="text-white">EPS del Participante *</Label>
                  <Input
                    id="eps"
                    placeholder="Nombre de la EPS del participante"
                    value={formData.eps}
                    onChange={(e) => updateFormData('eps', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                <Label htmlFor="bloodType" className="text-white">Tipo de Sangre del Participante *</Label>
                  <Select
                    value={formData.bloodType}
                    onValueChange={(value) => updateFormData('bloodType', value)}
                  >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                    {BLOOD_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>

              <div className="col-span-full">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="hasSisben"
                    checked={formData.hasSisben}
                    onCheckedChange={(checked) => updateFormData('hasSisben', checked)}
                  />
                  <Label htmlFor="hasSisben" className="text-white">Tiene SISBEN</Label>
                </div>
                </div>

                <div className="col-span-full">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="hasRestrictions"
                      checked={formData.hasRestrictions}
                      onCheckedChange={(checked) => updateFormData('hasRestrictions', checked)}
                    />
                    <Label htmlFor="hasRestrictions" className="text-white">Tiene restricciones médicas</Label>
                  </div>
                  {formData.hasRestrictions && (
                    <Textarea
                      placeholder="Describa las restricciones médicas del participante..."
                    value={formData.restrictionsDescription || ''}
                      onChange={(e) => updateFormData('restrictionsDescription', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white mt-2"
                    />
                  )}
                </div>

                <div className="col-span-full">
                <Label htmlFor="medicalConditions" className="text-white">Condiciones Médicas del Participante</Label>
                  <Textarea
                    id="medicalConditions"
                  placeholder="Describa cualquier condición médica relevante del participante..."
                  value={formData.medicalConditions || ''}
                  onChange={(e) => updateFormData('medicalConditions', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                />
              </div>
            </div>

          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            {/* Único contacto con etiqueta dinámica */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-600">
              <div className="col-span-full flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">{formData.isAdult ? 'Contacto de Emergencia del Participante' : 'Acudiente del Participante'}</h3>
            </div>

                    <div>
                  <Label className="text-white mb-1">Nombres y apellidos {formData.isAdult ? 'del contacto de emergencia' : 'del acudiente'} *</Label>
                      <Input
                        placeholder="Nombre del contacto de emergencia"
                        value={formData.emergencyContactName}
                        onChange={(e) => updateFormData('emergencyContactName', validateAndFormatFullName(e.target.value))}
                        className={`bg-gray-800 border-gray-600 text-white ${formData.emergencyContactName && !isValidFullName(formData.emergencyContactName) ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {formData.emergencyContactName && !isValidFullName(formData.emergencyContactName) && (
                        <p className="text-red-400 text-xs mt-1">
                          Solo letras y espacios, mínimo 10 caracteres
                        </p>
                      )}
                    </div>

                  <div>
                <Label className="text-white mb-1">Parentesco *</Label>
                <Select 
                  value={formData.emergencyContactRelation}
                  onValueChange={(value) => updateFormData('emergencyContactRelation', value)}
                >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Selecciona parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONS.map(relation => (
                          <SelectItem key={relation.value} value={relation.value}>{relation.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

              <div>
                <Label className="text-white mb-1">Celular {formData.isAdult ? 'del contacto de emergencia' : 'del acudiente'} *</Label>
                <div className="relative">
                  <Input
                    placeholder="Número de teléfono del contacto de emergencia"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => updateFormData('emergencyContactPhone', validateAndFormatPhone(e.target.value))}
                    className={`bg-gray-800 border-gray-600 text-white pr-10 ${
                      formData.emergencyContactPhone && !isValidPhoneFormat(formData.emergencyContactPhone) 
                        ? 'border-red-500 focus:border-red-500' 
                        : formData.emergencyContactPhone && isValidPhoneFormat(formData.emergencyContactPhone)
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                    }`}
                  />
                  {formData.emergencyContactPhone && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isValidPhoneFormat(formData.emergencyContactPhone) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {formData.emergencyContactPhone && !isValidPhoneFormat(formData.emergencyContactPhone) && (
                  <p className="text-red-400 text-xs mt-1">
                    El teléfono debe tener exactamente 10 dígitos
                  </p>
                )}
                </div>
                </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            {/* Resumen de Inscripción */}
            {selectedClass && (
              <div className="bg-gray-800/50 border-gray-600 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                  Resumen de Inscripción
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Actividad:</span>
                      <p className="text-white font-medium">{selectedClass.name}</p>
                </div>
                    <div>
                      <span className="text-gray-400">Profesor:</span>
                      <p className="text-white font-medium">{selectedClass.trainer.name}</p>
              </div>
                    {selectedClass.location && (
                      <div>
                        <span className="text-gray-400">Ubicación:</span>
                        <p className="text-white font-medium">{selectedClass.location.name}</p>
            </div>
                    )}
                    <div>
                      <span className="text-gray-400">Participante:</span>
                      <p className="text-white font-medium">{formData.studentName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Documento:</span>
                      <p className="text-white font-medium">{formData.studentId}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Teléfono:</span>
                      <p className="text-white font-medium">{formData.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Términos y Condiciones */}
            <div className="bg-gray-800/50 border-gray-600 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Términos y Condiciones</h4>
                  
                  <div className="max-h-60 overflow-y-auto bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                    <p className="text-gray-300 text-sm leading-relaxed">
                    Yo manifiesto de forma voluntaria e irrevocable, que me hago responsable, y en consecuencia exonero en 
                    su totalidad la organización Paradise, en adelante LA ORGANIZACIÓN, por cualquier daño o perjuicio que 
                    le pueda llegar a ocurrir a mi persona o a mi representado, en adelante EL MENOR, durante los entrenamientos, 
                    competencias y diferentes actividades que realice LA ORGANIZACIÓN, o cualquier perjuicio que se derive 
                    de las actividades ya mencionadas. Por lo tanto exonero irrevocablemente de toda responsabilidad de 
                    cualquier tipo a LA ORGANIZACIÓN, por cualquier reclamo que tenga que ver con los perjuicios descritos 
                    que pueda sufrir EL MENOR y/o mi persona en mención. En efecto, todos los reclamos a cualquier causa, son 
                    declarados por medio de este documento como renunciados incondicionalmente, absoluta e irrevocablemente por 
                    mi parte, como representante legal del MENOR y/o de mi persona. Consecuentemente, en el momento que el MENOR 
                    que yo represento y/o mi persona, sufra algún perjuicio, me comprometo a asumir la responsabilidad por ello, 
                    y a asumir costos y gastos que se requieran para la atención de los perjuicios. Así mismo me comprometo a mantener 
                    la cobertura en salud del MENOR y/o mi persona en una EPS u otra entidad equivalente, y a dirigirme únicamente 
                    a la EPS o entidad a la que esté afiliado, para que se preste la atención médica y/o tratamiento necesario. 
                    Yo como representante del MENOR y/o de mi persona tengo claro que la participación en LA ORGANIZACIÓN es 
                    completamente voluntaria y no existe ninguna obligación y/o subordinación por LA ORGANIZACIÓN, y por ende asumo 
                    cualquier riesgo que se presente con LA ORGANIZACIÓN. Finalmente, manifiesto a LA ORGANIZACIÓN, que el MENOR por 
                    mi representado y/o mi persona, está cubierto por una EPS u otra entidad equivalente, tal y como consta en el 
                    documento que me comprometo a portar cada vez que EL MENOR y/o mi persona asista a las actividades de LA ORGANIZACIÓN. 
                    Todo esto con el interés de que en caso de accidente el entrenador de LA ORGANIZACIÓN pueda desplazarse con EL MENOR 
                    al Centro de Salud más cercano para su atención gracias a la afiliación a la EPS, y así poderle informar a su acudiente 
                    para su desplazamiento al mismo centro en caso de no estar en el entrenamiento.
                    <br /><br />
                    Además, autorización de uso de imágenes y videos, autorizo a LA ORGANIZACIÓN a utilizar fotografías y vídeos en 
                    los que aparezca EL MENOR y/o mi persona durante su participación en actividades para fines promocionales y educativos, 
                    incluyendo publicaciones en redes sociales, páginas web y material impreso.
                    <br /><br />

                    Entiendo que estas imágenes pueden ser compartidas públicamente y que LA ORGANIZACIÓN no asumirá responsabilidad por 
                    el uso de terceros.
                    </p>
                  </div>

                  <div className="flex items-start space-x-3 pt-4">
                    <Checkbox
                      id="terms"
                      checked={formData.acceptsTerms}
                      onCheckedChange={(checked) => updateFormData('acceptsTerms', checked)}
                      className="mt-1"
                    />
                    <Label htmlFor="terms" className="text-white leading-relaxed">
                      He leído, entendido y acepto los términos y condiciones mencionados anteriormente. 
                      Confirmo que toda la información proporcionada es veraz y completa.
                    </Label>
                  </div>
                </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container px-2 py-2 sm:px-6 sm:py-6 mx-auto">
        <div className="max-w-6xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs sm:text-sm text-gray-400">Paso {currentStep} de {totalSteps}</span>
              <span className="text-xs sm:text-sm text-gray-400">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Título del paso actual */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
              {currentStep === 1 && <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-white" />}
              {currentStep === 2 && <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />}
              {currentStep === 3 && <MapPin className="h-4 w-4 sm:h-6 sm:w-6 text-white" />}
              {currentStep === 4 && <UserCheck className="h-4 w-4 sm:h-6 sm:w-6 text-white" />}
              {currentStep === 5 && <MapPin className="h-4 w-4 sm:h-6 sm:w-6 text-white" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white">
                {currentStep === 1 && "Selecciona tu Actividad"}
                {currentStep === 2 && "Información Personal del Participante"}
                {currentStep === 3 && "Información Detallada del Participante"}
                {currentStep === 4 && "Contactos de Emergencia"}
                {currentStep === 5 && "Confirmar Inscripción"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                {currentStep === 1 && "Elige el deporte y horario en el que quieres participar"}
                {currentStep === 2 && "Datos básicos del participante"}
                {currentStep === 3 && "Ubicación y datos médicos"}
                {currentStep === 4 && "Información para casos de emergencia"}
                {currentStep === 5 && "Revisa los datos y acepta los términos"}
              </p>
            </div>
          </div>

              {renderStepContent()}

          <Separator className="my-4 sm:my-6 bg-gray-600" />

              {/* Navigation Buttons */}
          <div className="flex gap-2 sm:gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
              <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Anterior</span>
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceedFromStep(currentStep)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex-1 sm:flex-none"
                  >
                <span className="hidden sm:inline">Siguiente</span>
                <span className="sm:hidden">Continuar</span>
                <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={submitForm}
                    disabled={!canProceedFromStep(currentStep) || loading}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 flex-1 sm:flex-none"
                  >
                    {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </span>
                    ) : (
                      <>
                    <Send className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Confirmar Inscripción</span>
                    <span className="sm:hidden">Confirmar</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
        </div>
      </div>
    </div>
  )
} 
