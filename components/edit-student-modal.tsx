"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Heart, Phone, DollarSign, Camera, Trophy } from "lucide-react";
import { InteractiveMap } from "./interactive-map";
import { ProfilePhotoModal } from "@/components/profile/ProfilePhotoModal";

interface Student {
  id: string
  name: string
  email?: string // <-- Añadido para el formulario
  documentType?: string
  documentNumber: string
  birthDate?: string
  phone: string
  address?: string
  addressLatitude?: number
  addressLongitude?: number
  neighborhood?: string
  city: string
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
  monthlyFee: number
  jerseyNumber?: number
  isActive?: boolean // <-- Añadido para manejar el estado activo/inactivo
  // Relación con User
  user?: {
    id: number
    email: string
  }
  // Campo avatar directo en Student
  avatar?: string
  // Datos de inscripción
  enrollmentData?: {
    monthlyFee?: number
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
    emergencyContactName?: string
    emergencyContactRelation?: string
    emergencyContactPhone?: string
    guardianName?: string
    guardianRelation?: string
    guardianPhone?: string
  }
  // Legacy fields for compatibility
  age?: number;
  maritalStatus?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  relationship?: string;
  hasMedicalRestrictions?: boolean;
  medicalRestrictions?: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onStudentUpdated: () => void;
}

const documentTypes = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "RC", label: "Registro Civil" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PEP", label: "Permiso Especial de Permanencia" },
];

const relationshipOptions = [
  { value: "padre", label: "Padre" },
  { value: "madre", label: "Madre" },
  { value: "abuelo", label: "Abuelo(a)" },
  { value: "tio", label: "Tío(a)" },
  { value: "hermano", label: "Hermano(a)" },
  { value: "otro", label: "Otro" },
];

// Funciones de mapeo para convertir texto completo a código corto (para compatibilidad hacia atrás)
const mapDocumentTypeToCode = (type?: string) => {
  if (!type) return "CC";

  const fullToCodeMapping = {
    "Cédula de Ciudadanía": "CC",
    "Tarjeta de Identidad": "TI",
    "Registro Civil": "RC",
    "Cédula de Extranjería": "CE",
    "Permiso Especial de Permanencia": "PEP",
  };

  return fullToCodeMapping[type as keyof typeof fullToCodeMapping] || type;
};

const mapRelationshipToCode = (relation?: string) => {
  if (!relation) return "";

  const fullToCodeMapping = {
    Padre: "padre",
    Madre: "madre",
    "Abuelo(a)": "abuelo",
    "Tío(a)": "tio",
    "Hermano(a)": "hermano",
    Otro: "otro",
  };

  return (
    fullToCodeMapping[relation as keyof typeof fullToCodeMapping] ||
    relation.toLowerCase()
  );
};

export default function EditStudentModal({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
}: EditStudentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Student | null>(null);
  const { data: session } = useSession();

  // Check if current user is a student editing their own profile
  const isStudentEditingOwnProfile = session?.user?.role === 'STUDENT' && 
    (session?.user?.email === formData?.email || session?.user?.email === student?.email);
  
  // Check if user is admin or teacher
  const isAdmin = session?.user?.role === 'ADMIN';
  const isTeacher = session?.user?.role === 'TEACHER';
  const canEditJerseyNumber = isAdmin || isTeacher;

  useEffect(() => {
    const loadStudentData = async () => {
      if (student && student.id) {
        try {
          // Cargar datos completos del estudiante desde el API
          const response = await fetch(`/api/students/profile?studentId=${student.id}`);
          const data = await response.json();
          
          if (data.success && data.student) {
            const fullStudent = data.student;
            const initialData = {
              id: fullStudent.id.toString(),
              name: fullStudent.name,
              email: fullStudent.email || fullStudent.user?.email || '',
              avatar: fullStudent.avatar || '',
              phone: fullStudent.phone,
              documentNumber: fullStudent.documentNumber || fullStudent.id.toString(),
              documentType: fullStudent.documentType || fullStudent.enrollmentData?.documentType || 'CC',
              birthDate: fullStudent.birthDate || fullStudent.enrollmentData?.birthDate || '',
              address: fullStudent.address || fullStudent.enrollmentData?.address || '',
              addressLatitude: fullStudent.addressLatitude || fullStudent.enrollmentData?.addressLatitude,
              addressLongitude: fullStudent.addressLongitude || fullStudent.enrollmentData?.addressLongitude,
              neighborhood: fullStudent.neighborhood || fullStudent.enrollmentData?.neighborhood || '',
              city: fullStudent.city || fullStudent.enrollmentData?.city || 'Itagüí',
              hasSisben: fullStudent.hasSisben || fullStudent.enrollmentData?.hasSisben || false,
              eps: fullStudent.eps || fullStudent.enrollmentData?.eps || '',
              bloodType: fullStudent.bloodType || fullStudent.enrollmentData?.bloodType || '',
              hasRestrictions: fullStudent.hasRestrictions || fullStudent.enrollmentData?.hasRestrictions || false,
              restrictionsDescription: fullStudent.restrictionsDescription || fullStudent.enrollmentData?.restrictionsDescription || '',
              medicalConditions: fullStudent.medicalConditions || fullStudent.enrollmentData?.medicalConditions || '',
              isAdult: fullStudent.isAdult ?? fullStudent.enrollmentData?.isAdult ?? true,
              emergencyContactName: fullStudent.emergencyContactName || fullStudent.enrollmentData?.emergencyContactName || '',
              emergencyContactRelation: fullStudent.emergencyContactRelation || fullStudent.enrollmentData?.emergencyContactRelation || '',
              emergencyContactPhone: fullStudent.emergencyContactPhone || fullStudent.enrollmentData?.emergencyContactPhone || '',
              guardianName: fullStudent.guardianName || fullStudent.enrollmentData?.guardianName || '',
              guardianRelation: fullStudent.guardianRelation || fullStudent.enrollmentData?.guardianRelation || '',
              guardianPhone: fullStudent.guardianPhone || fullStudent.enrollmentData?.guardianPhone || '',
              monthlyFee: fullStudent.enrollmentData?.monthlyFee || 0,
              jerseyNumber: fullStudent.enrollmentData?.jerseyNumber || undefined,
              isActive: fullStudent.isActive ?? true
            }
            setFormData(initialData)
          } else {
            // Fallback a los datos básicos si no se puede cargar desde el API
            const initialData = {
              id: student.id.toString(),
              name: student.name,
              email: student.email || student.user?.email || '',
              avatar: student.avatar || '',
              phone: student.phone,
              documentNumber: student.documentNumber || student.id.toString(),
              documentType: student.documentType || 'CC',
              birthDate: student.birthDate || '',
              address: student.address || '',
              addressLatitude: student.addressLatitude,
              addressLongitude: student.addressLongitude,
              neighborhood: student.neighborhood || '',
              city: student.city || 'Itagüí',
              hasSisben: student.hasSisben || false,
              eps: student.eps || '',
              bloodType: student.bloodType || '',
              hasRestrictions: student.hasRestrictions || false,
              restrictionsDescription: student.restrictionsDescription || '',
              medicalConditions: student.medicalConditions || '',
              isAdult: student.isAdult ?? true,
              emergencyContactName: student.emergencyContactName || '',
              emergencyContactRelation: student.emergencyContactRelation || '',
              emergencyContactPhone: student.emergencyContactPhone || '',
              guardianName: student.guardianName || '',
              guardianRelation: student.guardianRelation || '',
              guardianPhone: student.guardianPhone || '',
              monthlyFee: student.enrollmentData?.monthlyFee || 0,
              jerseyNumber: student.jerseyNumber || undefined,
              isActive: student.isActive ?? true
            }
            setFormData(initialData)
          }
        } catch (error) {
          console.error('Error loading student data:', error);
          // Fallback a los datos básicos en caso de error
          const initialData = {
            id: student.id.toString(),
            name: student.name,
            email: student.email || student.user?.email || '',
            avatar: student.avatar || '',
            phone: student.phone,
            documentNumber: student.documentNumber || student.id.toString(),
            documentType: student.documentType || 'CC',
            birthDate: student.birthDate || '',
            address: student.address || '',
            addressLatitude: student.addressLatitude,
            addressLongitude: student.addressLongitude,
            neighborhood: student.neighborhood || '',
            city: student.city || 'Itagüí',
            hasSisben: student.hasSisben || false,
            eps: student.eps || '',
            bloodType: student.bloodType || '',
            hasRestrictions: student.hasRestrictions || false,
            restrictionsDescription: student.restrictionsDescription || '',
            medicalConditions: student.medicalConditions || '',
            isAdult: student.isAdult ?? true,
            emergencyContactName: student.emergencyContactName || '',
            emergencyContactRelation: student.emergencyContactRelation || '',
            emergencyContactPhone: student.emergencyContactPhone || '',
              guardianName: student.guardianName || '',
              guardianRelation: student.guardianRelation || '',
              guardianPhone: student.guardianPhone || '',
              monthlyFee: student.enrollmentData?.monthlyFee || 0,
              jerseyNumber: student.jerseyNumber || undefined,
              isActive: student.isActive ?? true
          }
          setFormData(initialData)
        }
      } else {
        setFormData(null)
      }
    }

    loadStudentData()
  }, [student]);

  const handleInputChange = (field: keyof Student, value: any) => {
    if (!formData) return;
    
    // Validar campos sensibles
    if ((field === 'monthlyFee' || field === 'isActive') && !isAdmin) {
      console.warn(`Campo ${field} no puede ser modificado por usuarios no administradores`);
      return;
    }
    
    if (field === 'jerseyNumber' && !canEditJerseyNumber) {
      console.warn(`Campo ${field} no puede ser modificado por usuarios no autorizados`);
      return;
    }
    
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Al actualizar, enviar solo el nombre a /api/students/profile y el email a /api/users/[id] si cambió
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setLoading(true);
    try {
      // Separar los datos planos y los de inscripción
      const {
        name, phone, documentType, birthDate, address, addressLatitude, addressLongitude, neighborhood, city, hasSisben, eps, bloodType, hasRestrictions, restrictionsDescription, medicalConditions, isAdult, monthlyFee, email, user, documentNumber, isActive,
        emergencyContactName, emergencyContactRelation, emergencyContactPhone,
        guardianName, guardianRelation, guardianPhone,  
        ...rest
      } = formData;

      // Datos de inscripción (enrollmentData)
      const enrollmentData = {
        documentType,
        birthDate,
        address,
        addressLatitude,
        addressLongitude,
        neighborhood,
        city,
        hasSisben,
        eps,
        bloodType,
        hasRestrictions,
        restrictionsDescription,
        medicalConditions,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        guardianName,
        guardianRelation,
        guardianPhone
      };

      // Enviar datos planos, enrollmentData y email en una sola petición
      const requestBody: any = {
        studentId: formData.id, // <-- Enviar siempre el id del estudiante
        name,
        phone,
        email: formData.email, // Enviar email para que el backend lo actualice en User
        enrollmentData,
      };

      // Solo incluir monthlyFee en enrollmentData si es admin
      if (isAdmin) {
        requestBody.enrollmentData.monthlyFee = monthlyFee;
        console.log("🔍 Modal: Admin updating monthlyFee to:", monthlyFee);
      }
      
      // Incluir jerseyNumber si es admin o teacher
      if (canEditJerseyNumber) {
        requestBody.enrollmentData.jerseyNumber = formData.jerseyNumber;
        console.log("🔍 Modal: Authorized user updating jerseyNumber to:", formData.jerseyNumber);
      }

      // Solo incluir campos sensibles si es admin
      if (isAdmin) {
        requestBody.isActive = formData.isActive;
      }

      console.log("🔍 Modal: Sending update request with data:", requestBody);

      const studentRes = await fetch(`/api/students/profile`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!studentRes.ok) {
        const errorData = await studentRes.json();
        console.error("❌ Modal: API error response:", errorData);
        throw new Error(`Error al actualizar el estudiante: ${errorData.error || studentRes.statusText}`)
      }

      const responseData = await studentRes.json();
      console.log("✅ Modal: Update successful:", responseData);

      toast({
        title: "Éxito",
        description: "Estudiante actualizado correctamente",
      })
      // Esperar a que el padre refresque el estudiante antes de cerrar el modal
      onStudentUpdated();
      onClose();
    } catch (error) {
      console.error("❌ Modal: Error updating student:", error);
      toast({
        title: "Error",
        description: "Error al actualizar el estudiante",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-4xl h-[90vh] max-h-[90vh] p-0 bg-gray-800/95 border border-gray-600 backdrop-blur-sm text-white overflow-hidden !left-[50%] !translate-x-[-50%]">
        <DialogHeader className="px-4 py-3 border-b border-gray-600 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-2 border border-blue-500">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            Editar Estudiante
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-6 [&_label]:text-white [&_label]:font-medium pb-4"
          >
            {/* Información Básica */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 p-1.5">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Foto de Perfil */}
                <div className="sm:col-span-2 flex flex-col items-center space-y-3 pb-4 border-b border-gray-600">
                  <Label className="text-white font-medium">Foto de Perfil</Label>
                  <div className="relative group">
                    
                    {formData.avatar && formData.avatar.trim() !== "" && formData.avatar !== undefined ? (
                      <img
                        src={formData.avatar}
                        alt={`Foto de ${formData.name}`}
                        className="w-20 h-20 rounded-full object-cover border-3 border-gray-500"
                        onError={e => {
                          // Si la imagen falla, mostrar las iniciales
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = document.getElementById('avatar-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      id="avatar-fallback"
                      style={{ display: (!formData.avatar || formData.avatar.trim() === "" || formData.avatar === undefined) ? 'flex' : 'none' }}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl border-3 border-gray-500"
                    >
                      {formData.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2) || "?"}
                    </div>
                    
                    <ProfilePhotoModal
                      studentId={formData.id}
                      currentPhotoUrl={formData.avatar}
                      onSuccess={(newPhotoUrl: string) => {
                        setFormData(prev => prev ? {
                          ...prev,
                          avatar: newPhotoUrl
                        } : null);
                      }}
                      customTrigger={
                        <button
                          type="button"
                          className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                          title="Cambiar foto de perfil"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center max-w-xs">
                    Haz clic en el botón de la cámara para cambiar la foto de perfil
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="name" className="text-white">
                    Nombre Completo *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <Select
                    value={formData.documentType || "CC"}
                    onValueChange={(value) =>
                      handleInputChange("documentType", value)
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="documentNumber">Número de Documento *</Label>
                  <Input
                    id="documentNumber"
                    value={formData.documentNumber || formData.id || ""}
                    onChange={(e) =>
                      handleInputChange("documentNumber", e.target.value)
                    }
                    required
                    disabled
                    className="bg-gray-600 cursor-not-allowed border-gray-500 text-gray-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    El número de documento no se puede modificar
                  </p>
                </div>

                <div>
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate || ""}
                    onChange={(e) =>
                      handleInputChange("birthDate", e.target.value)
                    }
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ubicación */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-green-500 to-teal-500 p-1.5">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Información básica en grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      required
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="neighborhood">Barrio</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ej: San Antonio de Prado"
                      value={formData.neighborhood || ""}
                      onChange={(e) =>
                        handleInputChange("neighborhood", e.target.value)
                      }
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Sección de mapa centrada */}
                <div className="w-full">
                  <InteractiveMap
                    address={formData.address || ""}
                    latitude={formData.addressLatitude}
                    longitude={formData.addressLongitude}
                    onAddressChange={(address) =>
                      handleInputChange("address", address)
                    }
                    onCoordinatesChange={(lat, lng) => {
                      handleInputChange("addressLatitude", lat);
                      handleInputChange("addressLongitude", lng);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información Médica */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-red-500 to-pink-500 p-1.5">
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  Información Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="eps">EPS</Label>
                  <Input
                    id="eps"
                    value={formData.eps || ""}
                    onChange={(e) => handleInputChange("eps", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="bloodType">Tipo de Sangre</Label>
                  <Select
                    value={formData.bloodType || ""}
                    onValueChange={(value) =>
                      handleInputChange("bloodType", value)
                    }
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
                    checked={formData.hasSisben || false}
                    onCheckedChange={(checked) =>
                      handleInputChange("hasSisben", checked)
                    }
                  />
                  <Label htmlFor="hasSisben">Tiene SISBEN</Label>
                </div>

                <div className="col-span-full">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="hasRestrictions"
                      checked={formData.hasRestrictions || false}
                      onCheckedChange={(checked) =>
                        handleInputChange("hasRestrictions", checked)
                      }
                    />
                    <Label htmlFor="hasRestrictions">
                      Tiene restricciones médicas
                    </Label>
                  </div>
                  {formData.hasRestrictions && (
                    <Textarea
                      placeholder="Describa las restricciones médicas..."
                      value={formData.restrictionsDescription || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "restrictionsDescription",
                          e.target.value
                        )
                      }
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  )}
                </div>

                <div className="col-span-full">
                  <Label htmlFor="medicalConditions">
                    Condiciones Médicas Adicionales
                  </Label>
                  <Textarea
                    id="medicalConditions"
                    placeholder="Describa cualquier condición médica adicional..."
                    value={formData.medicalConditions || ""}
                    onChange={(e) =>
                      handleInputChange("medicalConditions", e.target.value)
                    }
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contacto de Emergencia */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 p-1.5">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  Contacto de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="emergencyContactName">Nombre</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName || ""}
                    onChange={(e) =>
                      handleInputChange("emergencyContactName", e.target.value)
                    }
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyContactRelation">Relación</Label>
                  <Select
                    value={formData.emergencyContactRelation || ""}
                    onValueChange={(value) =>
                      handleInputChange("emergencyContactRelation", value)
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Seleccionar relación" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions.map((relation) => (
                        <SelectItem key={relation.value} value={relation.value}>
                          {relation.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone || ""}
                    onChange={(e) =>
                      handleInputChange("emergencyContactPhone", e.target.value)
                    }
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Estado Legal */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 p-1.5">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  Estado Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAdult"
                    checked={formData.isAdult || false}
                    onCheckedChange={(checked) =>
                      handleInputChange("isAdult", checked)
                    }
                  />
                  <Label htmlFor="isAdult">Es mayor de edad</Label>
                </div>
              </CardContent>
            </Card>

            {/* Información del Acudiente (solo si es menor de edad) */}
            {!formData.isAdult && (
              <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                    <div className="rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 p-1.5">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    Información del Acudiente
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="guardianName">Nombre del Acudiente</Label>
                    <Input
                      id="guardianName"
                      value={formData.guardianName || ""}
                      onChange={(e) =>
                        handleInputChange("guardianName", e.target.value)
                      }
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="guardianRelation">Relación</Label>
                    <Select
                      value={formData.guardianRelation || ""}
                      onValueChange={(value) =>
                        handleInputChange("guardianRelation", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Seleccionar relación" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipOptions.map((relation) => (
                          <SelectItem
                            key={relation.value}
                            value={relation.value}
                          >
                            {relation.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="guardianPhone">
                      Teléfono del Acudiente
                    </Label>
                    <Input
                      id="guardianPhone"
                      value={formData.guardianPhone || ""}
                      onChange={(e) =>
                        handleInputChange("guardianPhone", e.target.value)
                      }
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información Financiera */}
            <Card className="bg-gray-700/50 border-gray-600 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                  <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-1.5">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  Información Financiera
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-sm">
                  <Label htmlFor="monthlyFee">
                    Mensualidad {!isAdmin ? '(Solo administradores)' : '*'}
                  </Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.monthlyFee || 0}
                    onChange={(e) =>
                      handleInputChange(
                        "monthlyFee",
                        parseInt(e.target.value) || 0
                      )
                    }
                    required
                    disabled={!isAdmin}
                    className={`bg-gray-800 border-gray-600 text-white ${
                      !isAdmin ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                  {!isAdmin && (
                    <p className="text-xs text-gray-400 mt-1">
                      La mensualidad solo puede ser modificada por administradores
                    </p>
                  )}
                </div>
                
                {/* Estado del estudiante */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onCheckedChange={(checked) =>
                      handleInputChange("isActive", checked)
                    }
                    disabled={!isAdmin}
                  />
                  <Label htmlFor="isActive" className={`text-white ${
                    !isAdmin ? 'opacity-50' : ''
                  }`}>
                    Estudiante Activo
                  </Label>
                </div>
                <p className="text-xs text-gray-400">
                  {!isAdmin 
                    ? 'El estado del estudiante solo puede ser modificado por administradores'
                    : 'Desmarca esta opción para desactivar al estudiante'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Información Deportiva */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader className="pb-4">
                <CardTitle className="text-yellow-400 flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5" />
                  Información Deportiva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-sm">
                  <Label htmlFor="jerseyNumber">
                    Número de Camiseta {!canEditJerseyNumber ? '(Solo profesores y administradores)' : ''}
                  </Label>
                  <Input
                    id="jerseyNumber"
                    type="number"
                    min="1"
                    max="99"
                    placeholder="Ej: 10"
                    value={formData.jerseyNumber || ''}
                    onChange={(e) =>
                      handleInputChange(
                        "jerseyNumber",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    disabled={!canEditJerseyNumber}
                    className={`bg-gray-800 border-gray-600 text-white ${
                      !canEditJerseyNumber ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                  {!canEditJerseyNumber && (
                    <p className="text-xs text-gray-400 mt-1">
                      Solo los profesores y administradores pueden modificar este campo
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 sticky bottom-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-600 px-4 py-3 -mx-4 -mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 hover:text-white w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 w-full sm:w-auto"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
