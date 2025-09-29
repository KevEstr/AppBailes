"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Phone,
  Mail,
  IdCard,
  Heart,
  Calendar,
  DollarSign,
  UserCheck,
  GraduationCap,
  User,
  Camera,
  Trophy,
} from "lucide-react";
import { ProfilePhotoModal } from "@/components/profile/ProfilePhotoModal";
import { formatDateLongWithoutTimezone } from "@/lib/date-utils";

interface StudentEnrollmentData {
  id: number;
  documentType?: string;
  birthDate?: string;
  address?: string;
  addressLatitude?: number;
  addressLongitude?: number;
  neighborhood?: string;
  city?: string;
  hasSisben?: boolean;
  eps?: string;
  bloodType?: string;
  hasRestrictions?: boolean;
  restrictionsDescription?: string;
  medicalConditions?: string;
  isAdult?: boolean;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  // guardian fields removed
  monthlyFee?: number;
  jerseyNumber?: number;
  // Legacy fields for compatibility
  age?: number;
  maritalStatus?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  relationship?: string;
  hasMedicalRestrictions?: boolean;
  medicalRestrictions?: string;
}

interface EnrollmentDetail {
  id: number;
  studentId: number;
  classId: number;
  isActive: boolean;
  enrolledAt: string;
  createdAt: string;
  student: {
    id: number
    name: string
    phone: string
    hasDebt: boolean
    isActive: boolean
    avatar?: string
    user?: { 
      email: string;
    }
    enrollmentData?: StudentEnrollmentData
    debts: Array<{
      id: number;
      amount: number;
      concept: string;
      dueDate: string;
    }>;
    receipts: Array<{
      id: number;
      amount: number;
      concept: string;
      createdAt: string;
    }>;
    attendances: Array<{
      id: number;
      status: string;
      date: string;
      session?: {
        danceClass: {
          name: string;
        };
      };
    }>;
  };
  danceClass: {
    id: number;
    name: string;
    sport: string;
    price?: number;
    trainer: {
      id: number;
      name: string;
    };
    location?: {
      id: number;
      name: string;
      address?: string;
    };
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
  };
}

interface StudentDetailModalProps {
  enrollment: {
    id: number;
    student: {
      id: number
      name: string
      user?: { email: string }
      phone: string
      hasDebt: boolean
      isActive: boolean
    }
    danceClass: {
      name: string;
      sport: string;
      trainer: {
        name: string;
      };
      location?: {
        name: string;
        address?: string;
      };
    };
  };
}

export function StudentDetailModal({ enrollment }: StudentDetailModalProps) {
  const [detailData, setDetailData] = useState<EnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        const studentId = enrollment.student.id;
        const response = await fetch(`/api/students/${studentId}`);
        const data = await response.json();

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
              phone: data.student.phone,
              hasDebt: enrollment.student.hasDebt,
              isActive: enrollment.student.isActive,
              user: data.student.user,
              avatar: data.student.avatar || '',
              enrollmentData: data.student.enrollmentData ? {
                ...data.student.enrollmentData,
                id: data.student.enrollmentData.id,
                hasMedicalRestrictions: data.student.enrollmentData.hasRestrictions || false,
                medicalRestrictions: data.student.enrollmentData.restrictionsDescription || data.student.enrollmentData.medicalConditions,
                jerseyNumber: data.student.enrollmentData.jerseyNumber
              } : undefined,
              debts: [],
              receipts: [],
              attendances: [],
            },
            danceClass: {
              id: 0,
              name: enrollment.danceClass.name,
              sport: enrollment.danceClass.sport,
              price: undefined,
              trainer: {
                id: 0,
                name: enrollment.danceClass.trainer.name,
              },
              location: enrollment.danceClass.location
                ? {
                    id: 0,
                    name: enrollment.danceClass.location.name,
                    address: enrollment.danceClass.location.address,
                  }
                : undefined,
              schedules: [],
            },
          };
          setDetailData(detailData);
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
              phone: enrollment.student.phone,
              hasDebt: enrollment.student.hasDebt,
              isActive: enrollment.student.isActive,
              user: enrollment.student.user,
              avatar: data.student.avatar || '',
              enrollmentData: undefined,
              debts: [],
              receipts: [],
              attendances: [],
            },
            danceClass: {
              id: 0,
              name: enrollment.danceClass.name,
              sport: enrollment.danceClass.sport,
              price: undefined,
              trainer: {
                id: 0,
                name: enrollment.danceClass.trainer.name,
              },
              location: enrollment.danceClass.location
                ? {
                    id: 0,
                    name: enrollment.danceClass.location.name,
                    address: enrollment.danceClass.location.address,
                  }
                : undefined,
              schedules: [],
            },
          };
          setDetailData(mockDetailData);
        }
      } catch (error) {
        console.error("Error fetching detail data:", error);
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
            phone: enrollment.student.phone,
            hasDebt: enrollment.student.hasDebt,
            isActive: enrollment.student.isActive,
            user: enrollment.student.user,
            enrollmentData: undefined,
            debts: [],
            receipts: [],
            attendances: []
          },
          danceClass: {
            id: 0,
            name: enrollment.danceClass.name,
            sport: enrollment.danceClass.sport,
            price: undefined,
            trainer: {
              id: 0,
              name: enrollment.danceClass.trainer.name,
            },
            location: enrollment.danceClass.location
              ? {
                  id: 0,
                  name: enrollment.danceClass.location.name,
                  address: enrollment.danceClass.location.address,
                }
              : undefined,
            schedules: [],
          },
        };
        setDetailData(mockDetailData);
      } finally {
        setLoading(false);
      }
    };
    fetchDetailData();
  }, [enrollment]);

  const formatDate = (dateString: string) => {
    return formatDateLongWithoutTimezone(dateString);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(amount);
  };

  const getDayName = (dayOfWeek: number) => {
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return days[dayOfWeek];
  };

  const getAttendanceStatusBadge = (status: string) => {
    const statusMap = {
      PRESENT: { label: "Asistió", className: "bg-green-600" },
      LATE: { label: "Tardanza", className: "bg-yellow-600" },
      ABSENT: { label: "Faltó", className: "bg-red-600" },
      CHANGE_REQUEST: { label: "Cambio solicitado", className: "bg-blue-600" },
    };
    const config = statusMap[status as keyof typeof statusMap] || {
      label: status,
      className: "bg-gray-600",
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const generateGoogleMapsUrl = (enrollmentData: StudentEnrollmentData) => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return null;

    // Si tenemos coordenadas, usar esas
    if (enrollmentData.addressLatitude && enrollmentData.addressLongitude) {
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${enrollmentData.addressLatitude},${enrollmentData.addressLongitude}&zoom=16`;
    }

    // Si no tenemos coordenadas pero sí dirección, usar la dirección
    if (enrollmentData.address) {
      const encodedAddress = encodeURIComponent(
        `${enrollmentData.address}, Itagüí, Antioquia, Colombia`
      );
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodedAddress}`;
    }

    return null;
  };

  const mapUrl = detailData?.student.enrollmentData
    ? generateGoogleMapsUrl(detailData.student.enrollmentData)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!detailData) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No se pudieron cargar los detalles del estudiante.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-white">
      {/* Header Principal - Optimizado para móvil */}
      <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-600">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Avatar y nombre */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative group">
              {detailData.student.avatar && detailData.student.avatar.trim() !== '' ? (
                <img
                  src={detailData.student.avatar}
                  alt={`Foto de ${detailData.student.name}`}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-slate-600"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                  {detailData.student.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)}
                </div>
              )}
              
              {/* Profile Photo Modal with Camera Button */}
              <ProfilePhotoModal
                studentId={detailData.student.id.toString()}
                currentPhotoUrl={detailData.student.avatar}
                onSuccess={(newPhotoUrl: string) => {
                  setDetailData(prev => prev ? {
                    ...prev,
                    student: {
                      ...prev.student,
                      avatar: newPhotoUrl
                    }
                  } : null);
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
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                {detailData.student.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-300">
                <span className="flex items-center gap-1">
                  <IdCard className="w-3 h-3" />
                  CC: {detailData.student.id}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {detailData.student.phone}
                </span>
                {detailData.student.user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate max-w-32 sm:max-w-none" title={detailData.student.user.email}>{detailData.student.user.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Estados */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={detailData.student.isActive ? "default" : "secondary"}
              className={`${
                detailData.student.isActive
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600"
              } text-white border-0`}
            >
              {detailData.student.isActive ? "Activo" : "Inactivo"}
            </Badge>
            {detailData.student.hasDebt && (
              <Badge className="bg-red-600 hover:bg-red-700 text-white border-0">
                Con deuda
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Grid Principal - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Información Personal */}
        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-emerald-400 flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <User className="w-4 h-4" />
              </div>
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {detailData.student.enrollmentData ? (
              <>
                {detailData.student.enrollmentData.documentType && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Tipo de documento:</span>
                    <span className="font-medium text-white">
                      {detailData.student.enrollmentData.documentType}
                    </span>
                  </div>
                )}
                {detailData.student.enrollmentData.birthDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Fecha de nacimiento:</span>
                    <span className="font-medium text-white">
                      {formatDate(detailData.student.enrollmentData.birthDate)}
                    </span>
                  </div>
                )}
                {detailData.student.enrollmentData.bloodType && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Tipo de sangre:</span>
                    <Badge
                      variant="outline"
                      className="border-red-400 text-red-400 bg-red-950/30"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      {detailData.student.enrollmentData.bloodType}
                    </Badge>
                  </div>
                )}
                {detailData.student.enrollmentData.eps && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">EPS:</span>
                    <span className="font-medium text-white">
                      {detailData.student.enrollmentData.eps}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Estado:</span>
                  <Badge
                    className={`${
                      detailData.student.enrollmentData.isAdult !== false
                        ? "bg-blue-600"
                        : "bg-orange-600"
                    } text-white border-0`}
                  >
                    {detailData.student.enrollmentData.isAdult !== false
                      ? "Mayor de edad"
                      : "Menor de edad"}
                  </Badge>
                </div>

                {/* Contacto responsable (dinámico por edad) */}
                {(detailData.student.enrollmentData.emergencyContactName ||
                  detailData.student.enrollmentData.emergencyContact) && (
                  <>
                    <Separator className="bg-slate-700" />
                    <div className="space-y-2 pt-1">
                      <div className="text-orange-400 font-medium text-xs uppercase tracking-wide">
                        {detailData.student.enrollmentData.isAdult !== false ? 'Contacto de Emergencia' : 'Acudiente'}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Nombre:</span>
                          <span className="font-medium text-white text-right max-w-40 truncate" title={detailData.student.enrollmentData
                              .emergencyContactName ||
                              detailData.student.enrollmentData
                                .emergencyContact}>
                            {detailData.student.enrollmentData
                              .emergencyContactName ||
                              detailData.student.enrollmentData
                                .emergencyContact}
                          </span>
                        </div>
                        {(detailData.student.enrollmentData
                          .emergencyContactPhone ||
                          detailData.student.enrollmentData.emergencyPhone) && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Teléfono:</span>
                            <span className="font-medium text-white">
                              {detailData.student.enrollmentData
                                .emergencyContactPhone ||
                                detailData.student.enrollmentData
                                  .emergencyPhone}
                            </span>
                          </div>
                        )}
                        {(detailData.student.enrollmentData
                          .emergencyContactRelation ||
                          detailData.student.enrollmentData.relationship) && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300">Parentesco:</span>
                            <span className="font-medium text-white capitalize">
                              {detailData.student.enrollmentData
                                .emergencyContactRelation ||
                                detailData.student.enrollmentData.relationship}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Información del acudiente eliminada: ahora se muestra un solo contacto */}
              </>
            ) : (
              <div className="text-center py-6">
                <User className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">
                  Información personal no registrada
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna derecha: Información de Clase + Información Médica */}
        <div className="space-y-4">
          {/* Información de Clase */}
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-violet-400 flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-violet-500/20">
                  <GraduationCap className="w-4 h-4" />
                </div>
                Información de Clase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Clase:</span>
                <span className="font-medium text-white text-right max-w-40 truncate" title={detailData.danceClass.name}>
                  {detailData.danceClass.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Tipo:</span>
                <Badge
                  className={`${
                    detailData.danceClass.sport === "DANCE"
                      ? "bg-purple-600"
                      : "bg-orange-600"
                  } text-white border-0`}
                >
                  {detailData.danceClass.sport === "DANCE" ? "Baile" : "Deporte"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Entrenador:</span>
                <span className="font-medium text-white text-right max-w-40 truncate" title={detailData.danceClass.trainer.name}>
                  {detailData.danceClass.trainer.name}
                </span>
              </div>
              {detailData.danceClass.price && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Precio:</span>
                  <span className="font-semibold text-green-400">
                    {formatCurrency(detailData.danceClass.price)}
                  </span>
                </div>
              )}
              {detailData.danceClass.location && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Ubicación:</span>
                    <span className="font-medium text-white text-right max-w-40 truncate" title={detailData.danceClass.location.name}>
                      {detailData.danceClass.location.name}
                    </span>
                  </div>
                  {detailData.danceClass.location.address && (
                    <div className="flex items-start gap-2 pt-1">
                      <MapPin className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        {detailData.danceClass.location.address}
                      </span>
                    </div>
                  )}
                </>
              )}
              <Separator className="bg-slate-700" />
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Fecha de inscripción:</span>
                <span className="font-medium text-white">
                  {formatDate(detailData.enrolledAt)}
                </span>
              </div>

              {/* Horarios integrados aquí */}
              {detailData.danceClass.schedules &&
                detailData.danceClass.schedules.length > 0 && (
                  <>
                    <Separator className="bg-slate-700" />
                    <div className="space-y-2 pt-1">
                      <div className="text-blue-400 font-medium text-xs uppercase tracking-wide">
                        Horarios
                      </div>
                      <div className="space-y-1">
                        {detailData.danceClass.schedules.map(
                          (schedule, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-2 bg-slate-700/50 rounded text-xs"
                            >
                              <span className="font-medium text-white">
                                {getDayName(schedule.dayOfWeek)}
                              </span>
                              <span className="text-blue-300 font-mono">
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
            </CardContent>
          </Card>

          {/* Información Deportiva */}
          {detailData.student.enrollmentData?.jerseyNumber && (
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-400 flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-yellow-500/20">
                    <Trophy className="w-4 h-4" />
                  </div>
                  Información Deportiva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Número de camiseta:</span>
                  <Badge
                    className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 text-lg font-bold px-3 py-1"
                  >
                    #{detailData.student.enrollmentData.jerseyNumber}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información Médica - Ahora en la misma columna */}
          {detailData.student.enrollmentData && (
            <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-red-500/20">
                    <Heart className="w-4 h-4" />
                  </div>
                  Información Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Información médica básica */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">SISBEN:</span>
                    <Badge
                      className={`${
                        detailData.student.enrollmentData.hasSisben
                          ? "bg-green-600"
                          : "bg-slate-600"
                      } text-white border-0`}
                    >
                      {detailData.student.enrollmentData.hasSisben
                        ? "Sí"
                        : "No"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">
                      Restricciones médicas:
                    </span>
                    <Badge
                      className={`${
                        detailData.student.enrollmentData.hasRestrictions ||
                        detailData.student.enrollmentData.hasMedicalRestrictions
                          ? "bg-red-600"
                          : "bg-green-600"
                      } text-white border-0`}
                    >
                      {detailData.student.enrollmentData.hasRestrictions ||
                      detailData.student.enrollmentData.hasMedicalRestrictions
                        ? "Sí"
                        : "No"}
                    </Badge>
                  </div>
                </div>

                {/* Alertas médicas */}
                {(detailData.student.enrollmentData.hasRestrictions ||
                  detailData.student.enrollmentData.hasMedicalRestrictions) && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    {(detailData.student.enrollmentData.restrictionsDescription ||
                      detailData.student.enrollmentData.medicalRestrictions) && (
                      <div className="flex-1 p-4 bg-red-950/30 border border-red-800/50 rounded-lg min-w-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-400 mb-2">
                            Restricciones médicas:
                          </p>
                          <p className="text-sm text-slate-100 leading-relaxed">
                            {detailData.student.enrollmentData.restrictionsDescription ||
                              detailData.student.enrollmentData.medicalRestrictions}
                          </p>
                        </div>
                      </div>
                    )}
                    {detailData.student.enrollmentData.medicalConditions && (
                      <div className="flex-1 p-4 bg-yellow-950/30 border border-yellow-800/50 rounded-lg min-w-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-400 mb-2">
                            Condiciones médicas adicionales:
                          </p>
                          <p className="text-sm text-slate-100 leading-relaxed">
                            {detailData.student.enrollmentData.medicalConditions}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Ubicación - Solo si hay datos */}
      {detailData.student.enrollmentData?.address && (
        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              Ubicación del Estudiante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-slate-300 text-xs uppercase tracking-wide">
                  Dirección
                </span>
                <p className="text-white font-medium">
                  {detailData.student.enrollmentData.address}
                </p>
              </div>
              {detailData.student.enrollmentData.neighborhood && (
                <div>
                  <span className="text-slate-300 text-xs uppercase tracking-wide">
                    Barrio
                  </span>
                  <p className="text-white font-medium">
                    {detailData.student.enrollmentData.neighborhood}
                  </p>
                </div>
              )}
              <div>
                <span className="text-slate-300 text-xs uppercase tracking-wide">
                  Ciudad
                </span>
                <p className="text-white font-medium">
                  {detailData.student.enrollmentData.city || "Itagüí"}
                </p>
              </div>
            </div>

            {mapUrl && !mapError && (
              <div className="mt-4">
                <div className="aspect-video w-full max-w-2xl mx-auto">
                  <iframe
                    src={mapUrl}
                    title={`Mapa de ${detailData?.student.name}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="rounded-lg border border-slate-600"
                    onError={() => setMapError(true)}
                  />
                </div>
              </div>
            )}

            {(mapError || !mapUrl) && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg text-center">
                <MapPin className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-300 text-sm mb-3">
                  {!mapUrl ? "Mapa no disponible" : "Error al cargar el mapa"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                  onClick={() => {
                    const address = `${detailData.student.enrollmentData?.address}, Itagüí, Antioquia, Colombia`;
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        address
                      )}`,
                      "_blank"
                    );
                  }}
                >
                  Abrir en Google Maps
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deudas */}
        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-red-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
              Deudas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailData.student.debts && detailData.student.debts.length > 0 ? (
              <div className="space-y-2">
                {detailData.student.debts.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-red-400 text-sm">
                          {debt.concept}
                        </p>
                        <p className="text-xs text-slate-300">
                          Vence: {formatDate(debt.dueDate)}
                        </p>
                      </div>
                      <span className="font-bold text-red-400 text-sm">
                        {formatCurrency(debt.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <UserCheck className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-green-400 text-sm font-medium">
                  Sin deudas pendientes
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Pagos */}
        <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
              Últimos Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailData.student.receipts &&
            detailData.student.receipts.length > 0 ? (
              <div className="space-y-2">
                {detailData.student.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="p-3 bg-green-950/30 border border-green-800/50 rounded-lg"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-green-400 text-sm">
                          {receipt.concept}
                        </p>
                        <p className="text-xs text-slate-300">
                          {formatDate(receipt.createdAt)}
                        </p>
                      </div>
                      <span className="font-bold text-green-400 text-sm">
                        {formatCurrency(receipt.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <DollarSign className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">
                  No hay pagos registrados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Asistencias */}
      {detailData.student.attendances &&
        detailData.student.attendances.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 hover:bg-slate-800/80 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-400 flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <Calendar className="w-4 h-4" />
                </div>
                Historial de Asistencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {detailData.student.attendances.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {formatDate(attendance.date)}
                      </p>
                      {attendance.session?.danceClass && (
                        <p className="text-xs text-slate-300">
                          {attendance.session.danceClass.name}
                        </p>
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
  );
}