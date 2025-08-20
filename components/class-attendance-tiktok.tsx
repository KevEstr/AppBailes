"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Check,
  X,
  Clock as ClockIcon,
  AlertTriangle as AlertIcon,
  User as UserIcon,
  Users as UsersIcon,
  ArrowLeft as ArrowLeftIcon,
  Calendar as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  Eye as EyeIcon,
  RefreshCw as RefreshIcon,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentTransferModal } from "./StudentTransferModal";

interface Student {
  id: string;
  name: string;
  avatar: string;
  hasDebt: boolean;
  status?: "present" | "late" | "absent" | "change_request";
}

interface ClassSchedule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DanceClass {
  id: number;
  name: string;
  description?: string;
  sport: string;
  level: string;
  capacity: number;
  trainer: {
    id: number;
    name: string;
  };
  schedules: ClassSchedule[];
  enrollments: {
    student: {
      id: string;
      name: string;
      avatar: string;
      hasDebt: boolean;
    };
  }[];
}

interface ClassSession {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  danceClass: DanceClass;
  attendances: {
    id: number;
    status: string;
    student: {
      id: string;
      name: string;
      avatar: string;
    };
  }[];
  _count: {
    attendances: number;
  };
}

interface AttendanceHistory {
  sessionId: number;
  date: string;
  status: string;
  present: number;
  absent: number;
  late: number;
  change_request: number;
  total: number;
}

export default function ClassAttendanceTikTok() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentSession, setCurrentSession] = useState<ClassSession | null>(
    null
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Debug: Log del estado de loading
  console.log('🔄 Estado de loading:', loading);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceHistory[]
  >([]);
  const [sessionAlreadyCompleted, setSessionAlreadyCompleted] = useState(false);
  const [canRetakeAttendance, setCanRetakeAttendance] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    change_request: 0,
    total: 0,
  });

  // Estados para transferencia de estudiantes
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState<Student | null>(null);

  // Función mejorada para verificar si una clase está activa en este momento
  const isClassActiveNow = useCallback((schedules: ClassSchedule[]) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutos desde medianoche

    // Filtrar solo horarios del día actual y activos
    const todaySchedules = schedules.filter(s => s.dayOfWeek === currentDay && s.isActive);
    
    if (todaySchedules.length === 0) {
      return false;
    }

    // Verificar si alguno de los horarios de hoy está activo
    const isActive = todaySchedules.some((schedule) => {
      const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
      const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Manejar horarios que cruzan medianoche (ej: 23:00 - 01:00)
      let isInTimeRange = false;
      if (endTime < startTime) {
        // Horario cruza medianoche
        isInTimeRange = currentTime >= startTime || currentTime <= endTime;
      } else {
        // Horario normal
        isInTimeRange = currentTime >= startTime && currentTime <= endTime;
      }

      // Log detallado para debugging (solo si está activo)
      if (isInTimeRange) {
        console.log('⏰ Horario ACTIVO:', {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          currentTime: `${now.getHours()}:${now.getMinutes()}`
        });
      }

      return isInTimeRange;
    });

            // Log resumen para la clase (solo si está activa)
        if (isActive) {
          console.log('📅 Clase ACTIVA hoy:', {
            schedules: todaySchedules.map(s => `${s.startTime}-${s.endTime}`)
          });
        }

    return isActive;
  }, []);

  // Función para verificar si se puede retomar asistencia
  const canRetakeAttendanceNow = useCallback((session: ClassSession) => {
    if (!session || session.status === "CANCELLED") return false;
    const now = new Date();
    const schedules = session.danceClass?.schedules || [];
    const todaySchedule = schedules.find(
      (s: ClassSchedule) => s.isActive && s.dayOfWeek === now.getDay()
    );
    if (!todaySchedule) return false;

    const [endHour, endMinute] = todaySchedule.endTime.split(":").map(Number);
    const [startHour] = todaySchedule.startTime.split(":").map(Number);
    const classEndTime = new Date(now);
    classEndTime.setHours(endHour, endMinute, 0, 0);
    if (endHour < startHour) classEndTime.setDate(classEndTime.getDate() + 1);

    return now <= classEndTime;
  }, []);

  // Cargar clases activas en este momento
  const loadActiveClasses = useCallback(async () => {
    try {
      setLoading(true);
      // Cargar todas las clases sin paginación para poder filtrar correctamente
      const response = await fetch("/api/classes?active=true&pageSize=100");
      const data = await response.json();

      console.log('📡 DEBUG - Respuesta del API:', { success: data.success, totalClases: data.classes?.length || 0 })

      if (data.success) {
        console.log('📚 DEBUG - Clases recibidas:', data.classes.length)
        // Mostrar solo las clases de DANCE para debug
        const danceClasses = data.classes.filter((c: DanceClass) => c.sport === 'DANCE');
        console.log('💃 Clases de DANCE encontradas:', danceClasses.map((c: DanceClass) => ({ id: c.id, name: c.name })))

        // Filtrar solo las clases que están activas en este momento
        const activeClasses = data.classes.filter((danceClass: DanceClass) => {
          const isActive = isClassActiveNow(danceClass.schedules);
          console.log(`🔍 Clase "${danceClass.name}" (${danceClass.sport}) es activa:`, isActive)
          return isActive;
        });

        console.log('✅ DEBUG - Clases activas encontradas:', activeClasses.length)
        console.log('📋 Clases activas:', activeClasses.map((c: DanceClass) => ({ 
          id: c.id, 
          name: c.name, 
          sport: c.sport,
          enrollments: c.enrollments.length,
          trainer: c.trainer.name
        })))
        console.log('🔄 Llamando setClasses con:', activeClasses.length, 'clases');
        setClasses(activeClasses);
      } else {
        // console.error('❌ Error en respuesta del API:', data)
        toast({
          title: "Error al cargar clases",
          description:
            "No se pudieron cargar las clases. Por favor, intenta de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading classes:", error);
      toast({
        title: "Error al cargar clases",
        description:
          "No se pudieron cargar las clases. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finalizando loadActiveClasses - setLoading(false)');
      setLoading(false);
    }
  }, [isClassActiveNow, toast]);

  useEffect(() => {
    console.log('🔄 useEffect ejecutándose - cargando clases activas');
    loadActiveClasses();

    // Recargar cada minuto para mantener actualizada la lista
    const interval = setInterval(() => {
      console.log('🔄 Intervalo ejecutándose - recargando clases activas');
      loadActiveClasses();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadActiveClasses]);

  const handleClassSelection = (classId: number) => {
    setSelectedClass(classId);
    setShowConfirmation(true);
  };

  const confirmStartAttendance = async () => {
    setShowConfirmation(false);
    await loadTodaySession();
  };

  const cancelClassSelection = () => {
    setSelectedClass(null);
    setShowConfirmation(false);
  };

  const loadTodaySession = useCallback(async () => {
    if (!selectedClass) return;

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Para clases que cruzan medianoche, también buscar en el día anterior
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Buscar sesiones tanto de hoy como de ayer con cache busting
      const cacheBuster = Date.now();
      const [todayResponse, yesterdayResponse] = await Promise.all([
        fetch(`/api/class-sessions?classId=${selectedClass}&date=${today}&_t=${cacheBuster}`),
        fetch(
          `/api/class-sessions?classId=${selectedClass}&date=${yesterdayStr}&_t=${cacheBuster}`
        ),
      ]);

      const todayData = await todayResponse.json();
      const yesterdayData = await yesterdayResponse.json();

      // Combinar todas las sesiones
      const allSessions = [
        ...(todayData.success ? todayData.sessions : []),
        ...(yesterdayData.success ? yesterdayData.sessions : []),
      ];
      console.log('🧭 DEBUG sesiones:', {
        total: allSessions.length,
        todayCount: todayData.success ? todayData.sessions?.length ?? 0 : 0,
        yesterdayCount: yesterdayData.success ? yesterdayData.sessions?.length ?? 0 : 0,
        nowLocal: new Date().toString(),
        sessions: allSessions.map((s: any) => ({
          id: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          classId: s.danceClass?.id,
          className: s.danceClass?.name,
          schedules: s.danceClass?.schedules?.map((sch: any) => ({ d: sch.dayOfWeek, start: sch.startTime, end: sch.endTime }))
        }))
      });

      // Selección robusta de la sesión actual (tolerante a TZ)
      const nowLocal = new Date();
      const todayLocalStr = nowLocal.toDateString();

      let selectedSession: ClassSession | undefined;

      // 0) Coincidencia directa con start/end de la sesión (si vienen correctos en UTC)
      const directMatch = allSessions.find((s: ClassSession) => {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        return nowLocal >= start && nowLocal <= end;
      });
      if (directMatch) {
        console.log('⏱️ Coincidencia directa con start/end de la sesión', { nowLocal, start: directMatch.startTime, end: directMatch.endTime });
        selectedSession = directMatch;
      }

      // 1) Priorizar sesiones cuyo "date" (solo día) coincide con hoy (en local)
      const todaysSessions: ClassSession[] = allSessions.filter((s: ClassSession) => {
        const sessionDayStr = new Date(s.date).toDateString();
        return sessionDayStr === todayLocalStr;
      });

      // 2) Entre las de hoy, elegir la que según el horario local esté en curso (con margen)
      const inWindow = (s: ClassSession) => {
        const schedules = s.danceClass?.schedules || [];
        const todaySchedule = schedules.find(
          (sch: ClassSchedule) => sch.isActive && sch.dayOfWeek === nowLocal.getDay()
        );
        if (!todaySchedule) return false;
        const [sh, sm] = todaySchedule.startTime.split(":").map(Number);
        const [eh, em] = todaySchedule.endTime.split(":").map(Number);
        const start = new Date(nowLocal);
        start.setHours(sh, sm, 0, 0);
        const end = new Date(nowLocal);
        end.setHours(eh, em, 0, 0);
        if (eh < sh) end.setDate(end.getDate() + 1);
        const graceBefore = new Date(start.getTime() - 20 * 60 * 1000);
        const graceAfter = new Date(end.getTime() + 20 * 60 * 1000);
        return nowLocal >= graceBefore && nowLocal <= graceAfter;
      };

      let currentSession = selectedSession ?? todaysSessions.find(inWindow);

      // 3) Si no hay ninguna en ventana, tomar la más cercana por hora de inicio de hoy
      if (!currentSession && todaysSessions.length > 0) {
        currentSession = [...todaysSessions].sort((a, b) => {
          const aDiff = Math.abs(new Date(a.startTime).getTime() - nowLocal.getTime());
          const bDiff = Math.abs(new Date(b.startTime).getTime() - nowLocal.getTime());
          return aDiff - bDiff;
        })[0];
      }

      // 4) Último fallback: si no hay de hoy, usar la primera sesión devuelta
      if (!currentSession && allSessions.length > 0) {
        currentSession = allSessions[0];
        console.warn('⚠️ Usando sesión por fallback (primera de la lista):', currentSession?.id);
      }

      if (currentSession) {
        const session = currentSession;
        setCurrentSession(session);

        const canRetake = canRetakeAttendanceNow(session);
        setCanRetakeAttendance(canRetake);

        // Preparar datos de estudiantes con asistencias existentes
        const enrolledStudents = session.danceClass.enrollments.map(
          (enrollment: any) => {
            const raw = session.attendances
              .find((att: any) => att.student.id === enrollment.student.id)
              ?.status?.toLowerCase();
            const validStatuses = [
              "present",
              "absent",
              "late",
              "change_request",
            ] as const;
            const status = validStatuses.includes(raw as any)
              ? (raw as Student["status"]) 
              : undefined;

            return {
              id: enrollment.student.id,
              name: enrollment.student.name,
              avatar: enrollment.student.avatar || "/placeholder.svg",
              hasDebt: enrollment.student.hasDebt,
              status,
            } as Student;
          }
        );
        setStudents(enrolledStudents);

        // Si no hay estudiantes después de la transferencia, mostrar mensaje
        if (enrolledStudents.length === 0) {
          toast({
            title: "ℹ️ Sin estudiantes",
            description: "No hay estudiantes inscritos en esta clase después de la transferencia",
          });
        }

        // Verificar si la sesión ya fue completada Y no se puede retomar
        if (session.status === "COMPLETED" && !canRetake) {
          setSessionAlreadyCompleted(true);
        } else {
          setSessionAlreadyCompleted(false);
          // Si la sesión está completada pero se puede retomar, mostrar mensaje especial
          if (session.status === "COMPLETED" && canRetake) {
            toast({
              title: "🔄 Sesión completada - Modificación disponible",
              description:
                "Puedes modificar la asistencia mientras la clase esté activa",
            });
          }
        }
      } else {
        toast({
          title: "❌ No hay sesión hoy",
          description: "No hay una sesión programada para hoy en esta clase",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading session:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo cargar la sesión",
        variant: "destructive",
      });
    }
  }, [selectedClass, canRetakeAttendanceNow, toast]);

  const loadAttendanceHistory = useCallback(async () => {
    if (!selectedClass) return;

    try {
      const response = await fetch(
        `/api/class-sessions?classId=${selectedClass}&status=COMPLETED`
      );
      const data = await response.json();

      if (data.success) {
        const history = data.sessions.map((session: ClassSession) => {
          const attendances = session.attendances || [];
          const summary = attendances.reduce(
            (acc, att) => {
              const status = att.status.toLowerCase();
              if (status === "present") acc.present++;
              else if (status === "absent") acc.absent++;
              else if (status === "late") acc.late++;
              else if (status === "change_request") acc.change_request++;
              return acc;
            },
            { present: 0, absent: 0, late: 0, change_request: 0 }
          );

          return {
            sessionId: session.id,
            date: session.date,
            status: session.status,
            ...summary,
            total: session.danceClass.enrollments.length,
          };
        });

        setAttendanceHistory(history);
      }
    } catch (error) {
      console.error("Error loading attendance history:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo cargar el historial",
        variant: "destructive",
      });
    }
  }, [selectedClass, toast]);

  const markAttendance = useCallback(
    async (studentId: string, status: string) => {
      if (!currentSession) {
        toast({
          title: "❌ Error",
          description: "No hay sesión activa",
          variant: "destructive",
        });
        return;
      }

      // Verificar que el estudiante aún esté en la lista
      const studentExists = students.find((s) => s.id === studentId);
      if (!studentExists) {
        toast({
          title: "❌ Error",
          description: "El estudiante ya no está inscrito en esta clase",
          variant: "destructive",
        });
        // Recargar la sesión para actualizar la lista
        await loadTodaySession();
        return;
      }

      try {
        const response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            status,
            sessionId: currentSession.id,
            timestamp: new Date(),
          }),
        });

        const result = await response.json();

        if (result.success) {
          setStudents((prev) =>
            prev.map((student) =>
              student.id === studentId
                ? { ...student, status: status as any }
                : student
            )
          );

          const statusMessages = {
            present: "✅ Presente",
            late: "⏰ Llegada Tarde",
            absent: "❌ Ausente",
            change_request: "🔄 Cambio de Grupo",
          };

          const studentName = students.find((s) => s.id === studentId)?.name;
          toast({
            title: statusMessages[status as keyof typeof statusMessages],
            description: studentName,
          });
        } else {
          // Si el error indica que el estudiante ya no está en la clase, recargar
          if (result.error && result.error.includes("no está inscrito")) {
            toast({
              title: "ℹ️ Estudiante transferido",
              description: "El estudiante ya no está en esta clase",
            });
            await loadTodaySession();
          } else {
            toast({
              title: "❌ Error",
              description: result.error || "No se pudo registrar",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error marking attendance:", error);
        toast({
          title: "❌ Error",
          description: "No se pudo registrar",
          variant: "destructive",
        });
      }
    },
    [currentSession, students, toast, loadTodaySession]
  );

  // Funciones para manejar transferencia de estudiantes
  const handleTransferRequest = (student: Student) => {
    setSelectedStudentForTransfer(student);
    setShowTransferModal(true);
  };

  const handleTransferComplete = async () => {
    try {
      // Recargar la lista de estudiantes después de la transferencia
      if (currentSession) {
        // Limpiar el estado actual antes de recargar
        setStudents([]);
        setCurrentStudentIndex(0);
        
        // Recargar la sesión
        await loadTodaySession();
        
        // Mostrar mensaje de éxito
        toast({
          title: "✅ Transferencia completada",
          description: "El estudiante ha sido transferido exitosamente",
        });
      }
    } catch (error) {
      console.error("Error al recargar después de transferencia:", error);
      toast({
        title: "⚠️ Advertencia",
        description: "La transferencia se completó pero hubo un problema al actualizar la vista",
        variant: "destructive",
      });
    } finally {
      setSelectedStudentForTransfer(null);
    }
  };

  const handleAttendanceAndNext = async (studentId: string, status: Student["status"]) => {
    await markAttendance(studentId, status as string);

    // Si estamos en modo de modificación (sesión ya completada), no avanzar automáticamente
    if (currentSession?.status === "COMPLETED") {
      toast({
        title: "✅ Asistencia actualizada",
        description: "Usa las flechas para navegar entre estudiantes",
      });
      return;
    }

    // Verificar si aún hay estudiantes después de la operación
    if (students.length === 0) {
      toast({
        title: "ℹ️ Sin estudiantes",
        description: "No hay estudiantes para tomar asistencia",
      });
      return;
    }

    // Modo normal: avanzar al siguiente estudiante o completar
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex((prev) => prev + 1);
    } else {
      // Asegurar que el último marcado se incluya en el resumen
      const updatedStudents = students.map((s) =>
        s.id === studentId ? { ...s, status } : s
      );
      await completeSession(updatedStudents);
    }
  };

  const completeSession = async (finalStudents?: Student[]) => {
    if (!currentSession) return;

    try {
      // Marcar sesión como completada
      const response = await fetch(
        `/api/class-sessions?id=${currentSession.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al completar sesión");
      }

      // Calcular resumen
      const list = finalStudents ?? students;
      const summary = list.reduce(
        (acc, student) => {
          if (student.status === "present") acc.present++;
          else if (student.status === "absent") acc.absent++;
          else if (student.status === "late") acc.late++;
          else if (student.status === "change_request") acc.change_request++;
          return acc;
        },
        {
          present: 0,
          absent: 0,
          late: 0,
          change_request: 0,
          total: list.length,
        }
      );

      setAttendanceSummary(summary);
      setShowSummary(true);
    } catch (error) {
      console.error("Error completing session:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo completar la sesión",
        variant: "destructive",
      });
    }
  };

  const finishAttendance = () => {
    setShowSummary(false);
    setSelectedClass(null);
    setCurrentStudentIndex(0);
    setCurrentSession(null);
    setStudents([]);
    setSessionAlreadyCompleted(false);
    setCanRetakeAttendance(false);
    toast({
      title: "✅ Asistencia completada",
      description: "La asistencia ha sido registrada exitosamente",
    });
  };

  const viewHistory = () => {
    loadAttendanceHistory();
    setShowHistory(true);
  };

  const retakeAttendance = () => {
    setSessionAlreadyCompleted(false);

    // Encontrar el primer estudiante sin asistencia o reiniciar desde el primero
    const firstUnmarkedIndex = students.findIndex((student) => !student.status);
    setCurrentStudentIndex(firstUnmarkedIndex >= 0 ? firstUnmarkedIndex : 0);

    toast({
      title: "🔄 Modificando asistencia",
      description: "Puedes cambiar la asistencia de cualquier estudiante",
    });
  };

  const getDayName = (date: Date) => {
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return days[date.getDay()];
  };

  const getDayNameFromNumber = (dayNumber: number) => {
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return days[dayNumber] || "Desconocido";
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "late":
        return "bg-yellow-500";
      case "change_request":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <Check className="h-4 w-4 text-white" />;
      case "absent":
        return <X className="h-4 w-4 text-white" />;
      case "late":
        return <ClockIcon className="h-4 w-4 text-white" />;
      case "change_request":
        return <AlertIcon className="h-4 w-4 text-white" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "present":
        return "Presente";
      case "absent":
        return "Ausente";
      case "late":
        return "Tardanza";
      case "change_request":
        return "Cambio";
      default:
        return "Sin marcar";
    }
  };

  // Debug: Log del estado actual
  console.log('🎨 RENDERIZANDO COMPONENTE:', {
    loading,
    classesCount: classes.length,
    classes: classes.map(c => ({ id: c.id, name: c.name })),
    classesArray: classes,
    classesType: typeof classes,
    classesIsArray: Array.isArray(classes)
  });

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando clases activas...</p>
        </div>
      </div>
    );
  }

  const selectedClassData = classes.find((c) => c.id === selectedClass);
  // Asegurar que el índice del estudiante actual sea válido
  const validStudentIndex = students.length > 0 ? Math.min(currentStudentIndex, students.length - 1) : 0;
  const currentStudent = students.length > 0 ? students[validStudentIndex] : null;
  const today = new Date();

  return (
    <div className="w-full h-full bg-gray-900">
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-blue-500" />
              Confirmar Asistencia
            </DialogTitle>
          </DialogHeader>

          {selectedClassData && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">
                    {selectedClassData.name.charAt(0)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">
                  {selectedClassData.name}
                </h3>
                <p className="text-gray-400">
                  Instructor: {selectedClassData.trainer.name}
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-400" />
                  <span className="text-sm">
                    Fecha: {getDayName(today)},{" "}
                    {today.toLocaleDateString("es-ES")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-green-400" />
                  <span className="text-sm">
                    Estudiantes inscritos:{" "}
                    {selectedClassData.enrollments.length}
                  </span>
                </div>
                {selectedClassData.schedules.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-300 mb-1">
                      Horarios:
                    </p>
                    {selectedClassData.schedules.map((schedule, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-400"
                      >
                        <ClockIcon className="h-3 w-3" />
                        {getDayNameFromNumber(schedule.dayOfWeek)}{" "}
                        {formatTime(schedule.startTime)} -{" "}
                        {formatTime(schedule.endTime)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-center text-gray-300">
                ¿Estás seguro de que quieres tomar la asistencia de esta clase?
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelClassSelection}>
              Cancelar
            </Button>
            <Button
              onClick={viewHistory}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <HistoryIcon className="h-4 w-4" />
              Historial
            </Button>
            <Button
              onClick={confirmStartAttendance}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Comenzar Asistencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HistoryIcon className="h-6 w-6 text-blue-500" />
              Historial de Asistencias
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {attendanceHistory.length === 0 ? (
              <div className="text-center py-8">
                <HistoryIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No hay historial de asistencias</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.map((record, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-white">
                          {new Date(record.date).toLocaleDateString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-gray-400">
                          Sesión #{record.sessionId}
                        </p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        Completada
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-green-400 font-bold">
                          {record.present}
                        </div>
                        <div className="text-gray-400">Presentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-400 font-bold">
                          {record.absent}
                        </div>
                        <div className="text-gray-400">Ausentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400 font-bold">
                          {record.late}
                        </div>
                        <div className="text-gray-400">Tardanzas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-400 font-bold">
                          {record.change_request}
                        </div>
                        <div className="text-gray-400">Cambios</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHistory(false)} variant="outline">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              Resumen de Asistencia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {currentSession?.danceClass.name}
              </h3>
              <p className="text-gray-400">
                {getDayName(today)}, {today.toLocaleDateString("es-ES")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {attendanceSummary.present}
                </div>
                <div className="text-sm text-green-300">Presentes</div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {attendanceSummary.absent}
                </div>
                <div className="text-sm text-red-300">Ausentes</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {attendanceSummary.late}
                </div>
                <div className="text-sm text-yellow-300">Tardanzas</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {attendanceSummary.change_request}
                </div>
                <div className="text-sm text-blue-300">Cambios</div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-lg font-semibold">Total de estudiantes</div>
              <div className="text-2xl font-bold text-blue-400">
                {attendanceSummary.total}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={finishAttendance}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!selectedClass ? (
        <div className="w-full p-4 md:p-6">
          <div className="w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Toma de Asistencia
              </h1>
              <div className="text-right">
                <p className="text-gray-400 text-sm md:text-base">
                  {classes.length} clases activas ahora
                </p>
                <p className="text-gray-500 text-xs">
                  {new Date().toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {classes.map((danceClass) => (
                <Button
                  key={danceClass.id}
                  onClick={() => handleClassSelection(danceClass.id)}
                  className="h-auto p-4 bg-gray-800 hover:bg-gray-700 text-left flex items-center space-x-4 rounded-xl border border-gray-700 transition-all duration-200 hover:border-gray-600 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-200">
                    <span className="text-white text-lg font-bold">
                      {danceClass.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg text-white truncate">
                      {danceClass.name}
                    </div>
                    <div className="text-sm text-gray-400 truncate flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      {danceClass.trainer.name}
                    </div>
                    {danceClass.schedules.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {danceClass.schedules.map((schedule, index) => (
                          <span key={index} className="mr-2">
                            {getDayNameFromNumber(schedule.dayOfWeek)}{" "}
                            {formatTime(schedule.startTime)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>

            {(!classes || classes.length === 0) && (
              <div className="text-center py-12">
                <ClockIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  No hay clases activas ahora
                </h3>
                <p className="text-gray-500">
                  No se encontraron clases en curso en este momento
                </p>
                <Button
                  onClick={loadActiveClasses}
                  className="mt-4"
                  variant="outline"
                >
                  <RefreshIcon className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : !currentSession ? (
        <div className="w-full p-4 flex items-center justify-center">
          <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">No hay clase hoy</h3>
              <p className="text-gray-400 text-sm">
                No hay sesión programada para hoy
              </p>
              <Button
                onClick={() => setSelectedClass(null)}
                className="mt-4 w-full"
                variant="outline"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Volver a selección
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : currentSession.danceClass.enrollments.length === 0 ? (
        <div className="w-full p-4 flex items-center justify-center">
          <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Sin estudiantes</h3>
              <p className="text-gray-400 text-sm">
                No hay estudiantes inscritos en esta clase
              </p>
              <Button
                onClick={() => setSelectedClass(null)}
                className="mt-4 w-full"
                variant="outline"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Volver a selección
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : sessionAlreadyCompleted ? (
        <div className="w-full p-4 flex items-center justify-center">
          <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Asistencia ya registrada
              </h3>
              <p className="text-gray-400 text-sm">
                {canRetakeAttendance
                  ? "La asistencia fue tomada, pero puedes modificarla mientras la clase esté activa"
                  : "La asistencia para esta clase ya fue tomada y la clase ha finalizado"}
              </p>

              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-white">Resumen actual:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">
                      {students.filter((s) => s.status === "present").length}
                    </div>
                    <div className="text-gray-400">Presentes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold">
                      {students.filter((s) => s.status === "absent").length}
                    </div>
                    <div className="text-gray-400">Ausentes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold">
                      {students.filter((s) => s.status === "late").length}
                    </div>
                    <div className="text-gray-400">Tardanzas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">
                      {
                        students.filter((s) => s.status === "change_request")
                          .length
                      }
                    </div>
                    <div className="text-gray-400">Cambios</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {canRetakeAttendance && (
                  <Button
                    onClick={retakeAttendance}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-lg py-3"
                  >
                    <RefreshIcon className="mr-2 h-5 w-5" />
                    Modificar Asistencia
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedClass(null)}
                  className="w-full"
                  variant="outline"
                >
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  Volver a selección
                </Button>
                <Button
                  onClick={viewHistory}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <HistoryIcon className="mr-2 h-4 w-4" />
                  Ver historial completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : students.length === 0 ? (
        <div className="w-full p-4 flex items-center justify-center">
          <Card className="border-0 shadow-xl rounded-2xl bg-gray-800/90 border border-gray-600 max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Sin estudiantes</h3>
              <p className="text-gray-400 text-sm">
                No hay estudiantes inscritos en esta clase después de la transferencia
              </p>
              <Button
                onClick={() => setSelectedClass(null)}
                className="mt-4 w-full"
                variant="outline"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Volver a selección
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : currentStudent ? (
        <div className="w-full flex flex-col bg-gradient-to-b from-gray-800 to-gray-900 relative">
          {/* Header con botón de retroceso */}
          <div className="sticky top-0 z-20 p-4 flex items-center justify-between border-b border-gray-700 bg-gray-800/95 backdrop-blur-sm">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-white">
                  {currentSession.danceClass.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {validStudentIndex + 1} de {students.length} estudiantes
                </p>
              </div>
            </div>

            {/* Navegación entre estudiantes */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentStudentIndex(Math.max(0, validStudentIndex - 1))
                }
                disabled={validStudentIndex === 0}
                className="text-gray-400 hover:text-white disabled:opacity-30"
              >
                ←
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentStudentIndex(
                    Math.min(students.length - 1, validStudentIndex + 1)
                  )
                }
                disabled={validStudentIndex === students.length - 1}
                className="text-gray-400 hover:text-white disabled:opacity-30"
              >
                →
              </Button>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="w-full flex space-x-1 p-2 bg-gray-800/95 backdrop-blur-sm sticky top-[72px] z-20">
            {students.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full ${
                  idx < validStudentIndex
                    ? "bg-blue-500"
                    : idx === validStudentIndex
                    ? "bg-blue-500/50"
                    : "bg-gray-700"
                }`}
              ></div>
            ))}
          </div>

          {/* Contenido Principal */}
          <div className="flex-1 w-full flex flex-col items-center justify-between min-h-[calc(100vh-8rem)] max-w-2xl mx-auto">
            {/* Contenido del Estudiante: foto a pantalla completa (vertical) */}
            <div className="w-full flex flex-col items-center pb-2 mt-6 md:mt-8">
              <div className="relative w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
                <div className="overflow-hidden rounded-2xl ring-4 ring-blue-500/30 bg-gray-900/40">
                  <img
                    src={currentStudent.avatar}
                    alt={currentStudent.name}
                    className="w-full h-[52vh] md:h-[60vh] object-cover object-center"
                  />
                </div>
                {currentStudent.hasDebt && (
                  <div className="absolute top-3 right-3 animate-pulse">
                    <div className="bg-red-500 text-white rounded-full p-2 shadow-lg shadow-red-500/30">
                      <AlertCircle className="h-7 w-7" />
                    </div>
                  </div>
                )}
                {currentStudent.status && (
                  <div className="absolute bottom-3 left-3">
                    <Badge
                      className={`${getStatusColor(
                        currentStudent.status
                      )} text-white px-3 py-1 text-sm md:text-base rounded-full shadow-lg shadow-black/30`}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(currentStudent.status)}
                        <span>{getStatusText(currentStudent.status)}</span>
                      </div>
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="w-full space-y-3 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700">
              {/* Nombre y estado junto a los botones */}
              <div className="px-3 pt-3">
                <div className="flex items-center justify-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
                    {currentStudent.name}
                  </h2>
                </div>
                {currentStudent.hasDebt && (
                  <p className="mt-1 text-red-400 text-sm md:text-base flex items-center justify-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Tiene pagos pendientes
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 p-3">
                <Button
                  onClick={() =>
                    handleAttendanceAndNext(currentStudent.id, "present")
                  }
                  className={`h-20 md:h-24 rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === "present"
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                      : "bg-green-600/10 hover:bg-green-600/20 text-green-500 hover:text-green-400"
                  }`}
                >
                  <Check className="h-8 w-8 md:h-10 md:w-10 mr-2" />
                  Presente
                </Button>

                <Button
                  onClick={() =>
                    handleAttendanceAndNext(currentStudent.id, "absent")
                  }
                  className={`h-20 md:h-24 rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === "absent"
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
                      : "bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400"
                  }`}
                >
                  <X className="h-8 w-8 md:h-10 md:w-10 mr-2" />
                  Ausente
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                <Button
                  onClick={() =>
                    handleAttendanceAndNext(currentStudent.id, "late")
                  }
                  className={`h-20 md:h-24 rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === "late"
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-600/20"
                      : "bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 hover:text-yellow-400"
                  }`}
                >
                  <ClockIcon className="h-8 w-8 md:h-10 md:w-10 mr-2" />
                  Tarde
                </Button>

                <Button
                  onClick={() => handleTransferRequest(currentStudent)}
                  className={`h-20 md:h-24 rounded-2xl text-lg md:text-xl font-medium transition-all duration-300 ${
                    currentStudent.status === "change_request"
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                      : "bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 hover:text-blue-400"
                  }`}
                >
                  <ArrowRight className="h-8 w-8 md:h-10 md:w-10 mr-2" />
                  Cambio
                </Button>
              </div>

              {/* Botón para finalizar modificación si estamos en modo edición */}
              {currentSession?.status === "COMPLETED" && (
                <div className="px-3 pb-3">
                  <Button
                    onClick={() => setSessionAlreadyCompleted(true)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white h-14 text-lg rounded-xl"
                    variant="outline"
                  >
                    <CheckCircleIcon className="mr-2 h-6 w-6" />
                    Finalizar Modificación
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de Transferencia de Estudiante */}
      <StudentTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedStudentForTransfer(null);
        }}
        student={selectedStudentForTransfer ? {
          id: selectedStudentForTransfer.id.toString(),
          name: selectedStudentForTransfer.name,
          phone: '', // Se puede obtener del estudiante si es necesario
          avatar: selectedStudentForTransfer.avatar
        } : null}
        currentClass={currentSession?.danceClass ? {
          id: currentSession.danceClass.id,
          name: currentSession.danceClass.name,
          level: currentSession.danceClass.level,
          sport: currentSession.danceClass.sport,
          capacity: currentSession.danceClass.capacity,
          trainer: currentSession.danceClass.trainer,
          _count: { enrollments: currentSession.danceClass.enrollments.length }
        } : null}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  );
}
