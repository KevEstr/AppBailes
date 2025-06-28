"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Heart, 
  Shield, 
  UserCheck, 
  GraduationCap,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Users,
  CheckCircle,
  Trophy
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { InteractiveMap } from './interactive-map'

interface EnrollmentFormData {
  // Tipo de inscripción
  enrollmentType: 'dance' | 'sports'
  
  // Información de la clase/entrenamiento
  trainerId?: number
  classId?: number
  locationId?: number
  
  // Información del estudiante/deportista
  studentName: string
  documentType: string
  documentNumber: string
  birthDate: string
  phone: string
  email: string
  address: string
  addressLatitude?: number
  addressLongitude?: number
  neighborhood: string
  hasSisben: boolean
  eps: string
  bloodType: string
  hasRestrictions: boolean
  restrictionsDescription?: string
  medicalConditions?: string
  isAdult: boolean
  
  // Información de emergencia
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactPhone: string
  
  // Información del acudiente (si es menor)
  guardianName?: string
  guardianRelation?: string
  guardianPhone?: string
  
  // Aceptación de términos
  acceptsTerms: boolean
}

interface Trainer {
  id: number
  name: string
  email: string
}

interface SportLocation {
  id: number
  name: string
  address?: string
}

interface ClassData {
  id: number
  name: string
  description?: string
  trainer: string
  trainerId: number
  type: string
  location?: string
  locationId?: number
}

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "TI", label: "Tarjeta de Identidad" }, 
  { value: "RC", label: "Registro Civil" },
  { value: "CE", label: "Cédula de Extranjería" }
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

export function EnrollmentForm() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Dynamic data states
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [allClasses, setAllClasses] = useState<ClassData[]>([])
  const [filteredClasses, setFilteredClasses] = useState<ClassData[]>([])
  const [locations, setLocations] = useState<SportLocation[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState<EnrollmentFormData>({
    enrollmentType: 'dance',
    studentName: '',
    documentType: '',
    documentNumber: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    neighborhood: '',
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

  const totalSteps = 5

  // Load data functions
  const loadTrainers = async (type?: string) => {
    try {
      setLoadingData(true)
      const url = type ? `/api/enrollment/trainers?type=${type}` : '/api/enrollment/trainers'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setTrainers(data.trainers)
      }
    } catch (error) {
      console.error('Error loading trainers:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const loadAllClasses = async (type?: string) => {
    try {
      setLoadingData(true)
      let url = '/api/enrollment/classes'
      if (type) url += `?type=${type}`

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setAllClasses(data.classes)
        setFilteredClasses(data.classes) // Initially, filtered classes are the same as all classes
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const loadFilteredClasses = async (type?: string, trainerId?: number, locationId?: number) => {
    try {
      let url = '/api/enrollment/classes'
      const params = new URLSearchParams()
      if (type) params.append('type', type)
      if (trainerId) params.append('trainerId', trainerId.toString())
      if (locationId) params.append('locationId', locationId.toString())
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setFilteredClasses(data.classes)
      }
    } catch (error) {
      console.error('Error loading filtered classes:', error)
    }
  }

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/enrollment/locations')
      const data = await response.json()
      if (data.success) {
        setLocations(data.locations)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    if (formData.enrollmentType === 'dance') {
      loadTrainers('dance')
      loadAllClasses('dance')
    } else if (formData.enrollmentType === 'sports') {
      loadLocations()
      loadAllClasses('sports')
    }
  }, [formData.enrollmentType])

  const updateFormData = (field: keyof EnrollmentFormData, value: any) => {
    // Reset dependent fields when changing main selection
    if (field === 'enrollmentType') {
      setFormData(prev => ({
        ...prev,
        trainerId: undefined,
        locationId: undefined,
        classId: undefined,
        [field]: value
      }))
      return
    }
    
    // Reset class selection when changing trainer or location
    if (field === 'trainerId' || field === 'locationId') {
      setFormData(prev => ({
        ...prev,
        classId: undefined,
        [field]: value
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // For dance: load filtered classes when trainer changes
    if (field === 'trainerId' && formData.enrollmentType === 'dance') {
      loadFilteredClasses('dance', value)
    }
    
    // For sports: load filtered classes when location changes
    if (field === 'locationId' && formData.enrollmentType === 'sports') {
      loadFilteredClasses('sports', undefined, value)
    }
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
      const response = await fetch('/api/enrollments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Inscripción exitosa",
          description: "Tu inscripción ha sido procesada correctamente"
        })
        
        // Reset form
        setFormData({
          enrollmentType: 'dance',
          studentName: '',
          documentType: '',
          documentNumber: '',
          birthDate: '',
          phone: '',
          email: '',
          address: '',
          neighborhood: '',
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
        setCurrentStep(1)
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo procesar la inscripción",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Error al procesar la inscripción",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.enrollmentType && !!formData.classId
      case 2:
        return !!(formData.studentName && formData.documentType && formData.documentNumber && 
                 formData.birthDate && formData.phone && formData.email && formData.address && formData.neighborhood)
      case 3:
        return !!(formData.eps && formData.bloodType)
      case 4:
        return !!(formData.emergencyContactName && formData.emergencyContactRelation && 
                 formData.emergencyContactPhone && 
                 (formData.isAdult || (formData.guardianName && formData.guardianRelation && formData.guardianPhone)))
      case 5:
        return formData.acceptsTerms
      default:
        return true
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Tipo de Inscripción</h3>
              <p className="text-gray-400">Selecciona el área en la que te quieres inscribir</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.enrollmentType === 'dance' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-gray-600 bg-gray-800/50 hover:border-purple-400'
                }`}
                onClick={() => updateFormData('enrollmentType', 'dance')}
              >
                <CardContent className="p-6 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                  <h4 className="text-xl font-bold text-white mb-2">Baile</h4>
                  <p className="text-gray-400">Inscríbete en clases de baile urbano</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.enrollmentType === 'sports' 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 bg-gray-800/50 hover:border-blue-400'
                }`}
                onClick={() => updateFormData('enrollmentType', 'sports')}
              >
                <CardContent className="p-6 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                  <h4 className="text-xl font-bold text-white mb-2">Deportes</h4>
                  <p className="text-gray-400">Únete a nuestros entrenamientos deportivos</p>
                </CardContent>
              </Card>
            </div>

            {formData.enrollmentType === 'dance' && (
              <div className="space-y-6 mt-8">
                <div>
                  <Label className="text-white text-lg mb-4 block">Profesor con el que quieres bailar *</Label>
                  <Select 
                    key={`trainer-${formData.enrollmentType}`}
                    value={formData.trainerId ? formData.trainerId.toString() : ""}
                    onValueChange={(value) => updateFormData('trainerId', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Selecciona un profesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.filter(trainer => 
                        allClasses.some(cls => cls.trainerId === trainer.id && cls.type === 'DANCE')
                      ).map(trainer => (
                        <SelectItem key={trainer.id} value={trainer.id.toString()}>
                          {trainer.name} (Baile Urbano)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.trainerId && (
                  <div>
                    <Label className="text-white text-lg mb-4 block">Grupo de baile *</Label>
                    <Select 
                      key={`class-${formData.trainerId}`}
                      value={formData.classId ? formData.classId.toString() : ""}
                      onValueChange={(value) => updateFormData('classId', value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Selecciona un horario" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClasses.filter(cls => cls.type === 'DANCE' && cls.trainerId === formData.trainerId).map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {formData.enrollmentType === 'sports' && (
              <div className="space-y-6 mt-8">
                <div>
                  <Label className="text-white text-lg mb-4 block">Cancha donde entrenas *</Label>
                  <Select 
                    key={`location-${formData.enrollmentType}`}
                    value={formData.locationId ? formData.locationId.toString() : ""}
                    onValueChange={(value) => updateFormData('locationId', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Selecciona una cancha" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.locationId && (
                  <div>
                    <Label className="text-white text-lg mb-4 block">Grupo de entrenamiento *</Label>
                    <Select 
                      key={`class-${formData.locationId}`}
                      value={formData.classId ? formData.classId.toString() : ""}
                      onValueChange={(value) => updateFormData('classId', value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Selecciona un horario" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClasses.filter(cls => cls.type === 'SPORTS' && cls.locationId === formData.locationId).map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <User className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Información del {formData.enrollmentType === 'dance' ? 'Bailarín' : 'Deportista'}
              </h3>
              <p className="text-gray-400">Completa los datos personales</p>
            </div>

            {/* Información Básica */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 p-1.5">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentName" className="text-white">Nombre del Estudiante *</Label>
                  <Input
                    id="studentName"
                    value={formData.studentName}
                    onChange={(e) => updateFormData('studentName', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="documentType" className="text-white">Tipo de Documento</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => updateFormData('documentType', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
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
                  <Label htmlFor="documentNumber" className="text-white">Número de Documento *</Label>
                  <Input
                    id="documentNumber"
                    value={formData.documentNumber}
                    onChange={(e) => updateFormData('documentNumber', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => updateFormData('birthDate', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ubicación */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-green-500 to-teal-500 p-1.5">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Información básica en grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">Ciudad *</Label>
                    <Input
                      placeholder="Itagüí"
                      value="Itagüí"
                      disabled
                      className="bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label htmlFor="neighborhood" className="text-white">Barrio</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ej: San Antonio de Prado"
                      value={formData.neighborhood}
                      onChange={(e) => updateFormData('neighborhood', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Sección de mapa centrada */}
                <div className="w-full max-w-4xl mx-auto">
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
              </CardContent>
            </Card>

            {/* Información Médica */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-red-500 to-pink-500 p-1.5">
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  Información Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eps" className="text-white">EPS</Label>
                  <Input
                    id="eps"
                    placeholder="Nombre de la EPS"
                    value={formData.eps}
                    onChange={(e) => updateFormData('eps', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="bloodType" className="text-white">Tipo de Sangre</Label>
                  <Select
                    value={formData.bloodType}
                    onValueChange={(value) => updateFormData('bloodType', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasSisben"
                    checked={formData.hasSisben}
                    onCheckedChange={(checked) => updateFormData('hasSisben', checked)}
                  />
                  <Label htmlFor="hasSisben" className="text-white">Tiene SISBEN</Label>
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
                      placeholder="Describa las restricciones médicas..."
                      value={formData.restrictionsDescription}
                      onChange={(e) => updateFormData('restrictionsDescription', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  )}
                </div>

                <div className="col-span-full">
                  <Label htmlFor="medicalConditions" className="text-white">Condiciones Médicas Adicionales</Label>
                  <Textarea
                    id="medicalConditions"
                    placeholder="Describa cualquier condición médica adicional..."
                    value={formData.medicalConditions}
                    onChange={(e) => updateFormData('medicalConditions', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-r from-green-500 to-blue-600">
                  <Heart className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Información de Salud</h3>
              <p className="text-gray-400">Datos médicos importantes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white mb-2 block">EPS</Label>
                <Input
                  placeholder="Nombre de la EPS"
                  value={formData.eps}
                  onChange={(e) => updateFormData('eps', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Grupo sanguíneo *</Label>
                <Select onValueChange={(value) => updateFormData('bloodType', value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Selecciona grupo sanguíneo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white mb-4 block">¿Presenta restricciones para actividad física? *</Label>
                <RadioGroup 
                  value={formData.hasRestrictions ? "yes" : "no"} 
                  onValueChange={(value) => updateFormData('hasRestrictions', value === "yes")}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="restrictions-yes" />
                    <Label htmlFor="restrictions-yes" className="text-white">Sí</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="restrictions-no" />
                    <Label htmlFor="restrictions-no" className="text-white">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.hasRestrictions && (
                <div className="md:col-span-2">
                  <Label className="text-white mb-2 block">Descripción de restricciones</Label>
                  <Textarea
                    placeholder="Describe las restricciones médicas"
                    value={formData.restrictionsDescription || ''}
                    onChange={(e) => updateFormData('restrictionsDescription', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <Label className="text-white mb-2 block">¿Padece enfermedades o lesiones?</Label>
                <Textarea
                  placeholder="Describe cualquier condición médica relevante"
                  value={formData.medicalConditions || ''}
                  onChange={(e) => updateFormData('medicalConditions', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600">
                  <UserCheck className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Contactos de Emergencia</h3>
              <p className="text-gray-400">Información para casos de emergencia</p>
            </div>

            <Card className="bg-gray-800/50 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-orange-400" />
                  Contacto de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">Nombres y apellidos *</Label>
                    <Input
                      placeholder="Nombre del contacto"
                      value={formData.emergencyContactName}
                      onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white mb-2 block">Parentesco *</Label>
                    <Select onValueChange={(value) => updateFormData('emergencyContactRelation', value)}>
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

                  <div className="md:col-span-2">
                    <Label className="text-white mb-2 block">📲 Celular del contacto *</Label>
                    <Input
                      placeholder="Número de teléfono"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => updateFormData('emergencyContactPhone', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!formData.isAdult && (
              <Card className="bg-gray-800/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-400" />
                    Información del Acudiente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white mb-2 block">Nombres y apellidos *</Label>
                      <Input
                        placeholder="Nombre del acudiente"
                        value={formData.guardianName || ''}
                        onChange={(e) => updateFormData('guardianName', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Parentesco *</Label>
                      <Select onValueChange={(value) => updateFormData('guardianRelation', value)}>
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

                    <div className="md:col-span-2">
                      <Label className="text-white mb-2 block">📲 Celular del acudiente *</Label>
                      <Input
                        placeholder="Número de teléfono"
                        value={formData.guardianPhone || ''}
                        onChange={(e) => updateFormData('guardianPhone', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-to-r from-green-500 to-teal-600">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Términos y Condiciones</h3>
              <p className="text-gray-400">Acepta los términos para completar la inscripción</p>
            </div>

            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Reconocimiento de riesgos y exoneración de responsabilidad</h4>
                  
                  <div className="max-h-60 overflow-y-auto bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Yo manifiesto de forma voluntaria e irrevocable, que me hago responsable de los riesgos que 
                      pueden derivarse de la práctica de {formData.enrollmentType === 'dance' ? 'baile' : 'deportes'}. 
                      Entiendo que la participación en estas actividades conlleva riesgos inherentes de lesión, 
                      y acepto participar bajo mi propia responsabilidad.
                      <br /><br />
                      Declaro que mi estado de salud es adecuado para la práctica de estas actividades y que he 
                      proporcionado información veraz sobre mi condición médica. En caso de ser menor de edad, 
                      el acudiente autoriza la participación y asume la responsabilidad correspondiente.
                      <br /><br />
                      Autorizo el uso de imágenes y videos con fines promocionales de la institución, respetando 
                      siempre la dignidad y privacidad del participante.
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
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2 text-blue-400" />
                  Resumen de Inscripción
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Tipo:</span>
                    <Badge 
                      className={`${
                        formData.enrollmentType === 'dance' 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      } border`}
                    >
                      {formData.enrollmentType === 'dance' ? 'Baile' : 'Deportes'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Participante:</span>
                    <span className="text-white font-medium">{formData.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Documento:</span>
                    <span className="text-white font-medium">{formData.documentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Teléfono:</span>
                    <span className="text-white font-medium">{formData.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Formulario de Inscripción</h1>
            <p className="text-gray-400 text-lg">Paradise Dance Academy</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Paso {currentStep} de {totalSteps}</span>
              <span className="text-sm text-gray-400">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Form Content */}
          <Card className="bg-gray-800/90 border-gray-600 shadow-2xl">
            <CardContent className="p-8">
              {renderStepContent()}

              <Separator className="my-8 bg-gray-600" />

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="border-gray-600 text-white hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceedFromStep(currentStep)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={submitForm}
                    disabled={!canProceedFromStep(currentStep) || loading}
                    className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700"
                  >
                    {loading ? (
                      "Procesando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Inscripción
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 