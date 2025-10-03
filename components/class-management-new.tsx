"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdvancedPagination } from "@/components/ui/advanced-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Calendar,
  Edit,
  Trash2,
  UserPlus,
  BookOpen,
  GraduationCap,
  MapPin,
  Dumbbell,
  Building,
  Search,
  X,
  User,
  History,
  Filter,
  Download,
  CalendarDays,
  MessageSquare,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  DeleteClassConfirmationModal,
  DeleteEnrollmentConfirmationModal,
  EnrollmentModal 
} from "@/components/modals";
import { Student, Trainer, Location, DanceClass, ClassSchedule } from "@/types/class-management";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

// Interfaces para transferencias
interface StudentTransfer {
  id: number;
  studentId: string;
  fromClassId: number;
  toClassId: number;
  transferredBy: number;
  reason?: string;
  transferredAt: string;
  student: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    user?: {
      email: string;
    };
  };
  fromClass: {
    id: number;
    name: string;
    sport: string;
    level?: string;
    trainer: {
      id: number;
      name: string;
    };
  };
  toClass: {
    id: number;
    name: string;
    sport: string;
    level?: string;
    trainer: {
      id: number;
      name: string;
    };
  };
  user: {
    id: number;
    email: string;
    role: string;
    student?: {
      name: string;
    };
    trainer?: {
      name: string;
    };
  };
}

interface TransfersData {
  transfers: StudentTransfer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const SPORT_OPTIONS = [
  {
    value: "DANCE",
    label: "Baile Urbano",
    icon: GraduationCap,
    color: "from-purple-500 to-pink-600",
  },
  {
    value: "VOLLEYBALL",
    label: "Voleibol",
    icon: Dumbbell,
    color: "from-blue-500 to-green-600",
  },
];

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Principiante" },
  { value: "INTERMEDIATE", label: "Intermedio" },
  { value: "ADVANCED", label: "Avanzado" },
];

const getLevelLabel = (level: string) => {
  const levelOption = LEVEL_OPTIONS.find((opt) => opt.value === level);
  return levelOption?.label || "Avanzado";
};

const getSportBadgeClass = (sport: "DANCE" | "VOLLEYBALL") => {
  return sport === "DANCE"
    ? "bg-purple-600 text-white"
    : "bg-blue-600 text-white";
};

const getSportLabel = (sport: "DANCE" | "VOLLEYBALL") => {
  return sport === "DANCE" ? "💃 Baile" : "🏐 Voleibol";
};

const renderClassesList = (
  classes: DanceClass[],
  loading: boolean,
  openDeleteClassDialog: (danceClass: DanceClass) => void, // ✅ ACTUALIZADO: Cambiar a función de modal
  setSelectedClass: (danceClass: DanceClass) => void,
  setShowEnrollDialog: (show: boolean) => void,
  setViewingEnrolled: (show: boolean) => void,
  openEditDialog: (danceClass: DanceClass) => void
) => {
  if (loading) {
    return (
      <div className="col-span-3 flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="col-span-3 text-center text-gray-400 py-12">
        No hay clases para mostrar.
      </div>
    );
  }

  return classes.map((danceClass) => (
    <Card
      key={danceClass.id}
      className="border-0 shadow-2xl rounded-2xl sm:rounded-3xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 bg-gray-800/90 border border-gray-600 backdrop-blur-sm"
    >
      <CardContent className="p-4 sm:p-8">
        {/* Header de la clase */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
              <Badge
                className={`${getSportBadgeClass(
                  danceClass.sport
                )} border-0 text-xs sm:text-sm`}
              >
                {getSportLabel(danceClass.sport)}
              </Badge>
              {danceClass.level && (
                <Badge
                  variant="outline"
                  className="text-gray-300 border-gray-600 text-xs sm:text-sm"
                >
                  {getLevelLabel(danceClass.level)}
                </Badge>
              )}
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">
              {danceClass.name}
            </h3>
            <p className="text-gray-300 mb-2 text-sm sm:text-base truncate">
              {danceClass.description || "Sin descripción"}
            </p>
            <div className="space-y-1 text-xs sm:text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span className="truncate">{danceClass.trainer.name}</span>
              </div>
              {danceClass.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{danceClass.location.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-center gap-3 mt-2 sm:mt-0 sm:ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(danceClass)}
              className="border-blue-500 text-blue-400 hover:bg-blue-950 hover:text-blue-300 transition-colors duration-200 w-10 h-10 rounded-xl"
              title="Editar clase"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDeleteClassDialog(danceClass)}
              className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors duration-200 w-10 h-10 rounded-xl"
              title="Eliminar clase"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Estadísticas y horarios */}
        <div className="space-y-2 sm:space-y-4">
          <div className="flex justify-between items-center p-2 sm:p-4 bg-gray-700/50 rounded-xl">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium text-xs sm:text-base">
                Estudiantes
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-bold text-blue-400">
              {danceClass._count.enrollments}/{danceClass.capacity}
            </span>
          </div>

          <div className="p-2 sm:p-4 bg-gray-700/50 rounded-xl">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <Calendar className="h-4 w-4 text-green-400" />
              <span className="text-xs sm:text-sm font-medium text-gray-300">
                Horarios
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2">
              {danceClass.schedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                >
                  <span className="font-medium text-white">
                    {DAYS_OF_WEEK[schedule.dayOfWeek]}
                  </span>
                  <span className="text-green-300 font-mono">
                    {schedule.startTime} - {schedule.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Button
              onClick={() => {
                setSelectedClass(danceClass);
                setViewingEnrolled(false);
                setShowEnrollDialog(true);
              }}
              disabled={danceClass._count.enrollments >= danceClass.capacity}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Inscribir Estudiante
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedClass(danceClass);
                setViewingEnrolled(true);
                setShowEnrollDialog(true);
              }}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Users className="h-4 w-4 mr-2" />
              Ver Estudiantes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ));
};

export function ClassManagementNew() {
  // ✅ OPTIMIZACIONES IMPLEMENTADAS:
  // 1. Estado separado para loading de clases (classesLoading) vs loading general
  // 2. Efectos separados para evitar recargas innecesarias del modal
  // 3. Carga inicial única de datos base
  // 4. Recarga selectiva solo del div de clases al filtrar
  // 5. Mantenimiento del estado del modal durante filtros
  // 6. Búsqueda optimizada de estudiantes en modal de inscripción
  // 7. Modales de confirmación para eliminaciones
  // 8. Componentes modales separados en archivos individuales para mejor organización
  // 9. Tipos compartidos centralizados en /types/class-management.ts
  // 10. ✅ NUEVO: Sección de transferencias de estudiantes con pestañas
  
  const { toast } = useToast();
  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ NUEVO: Estado separado para loading de clases
  const [classesLoading, setClassesLoading] = useState(false);
  const [isDownloadingClasses, setIsDownloadingClasses] = useState(false);
  const [isDownloadingTransfers, setIsDownloadingTransfers] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<DanceClass | null>(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [viewingEnrolled, setViewingEnrolled] = useState(false);
  const [editingClass, setEditingClass] = useState<DanceClass | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ NUEVO: Estados para la sección de transferencias
  const [activeTab, setActiveTab] = useState("classes");
  const [transfers, setTransfers] = useState<StudentTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transfersPagination, setTransfersPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [transfersSearch, setTransfersSearch] = useState("");
  const [transfersDateRange, setTransfersDateRange] = useState<DateRange | undefined>();

  // ✅ NUEVO: Estados para la gestión de eventos
  const [eventData, setEventData] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    description: "",
    additionalInfo: ""
  });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<DanceClass[]>([]);
  const [allClassesLoading, setAllClassesLoading] = useState(false);

  // ✅ NUEVO: Estados para modales de confirmación
  const [showDeleteClassDialog, setShowDeleteClassDialog] = useState(false);
  const [classToDelete, setClassToDelete] = useState<DanceClass | null>(null);
  const [showDeleteEnrollmentDialog, setShowDeleteEnrollmentDialog] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<{
    enrollmentId: number;
    classId: number;
    studentName: string;
    className: string;
  } | null>(null);

  // Filtros
  const [filterSport, setFilterSport] = useState<string>("ALL");
  const [filterTrainer, setFilterTrainer] = useState<string>("ALL");
  const [filterLocation, setFilterLocation] = useState<string>("ALL");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  
  // ✅ NUEVO: Estados para búsqueda de estudiantes en el modal
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
  const [debouncedStudentSearchQuery, setDebouncedStudentSearchQuery] = useState<string>("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Formulario para nueva clase - memoizado
  const [newClass, setNewClass] = useState({
    name: "",
    description: "",
    sport: "DANCE" as "DANCE" | "VOLLEYBALL",
    level: "BEGINNER" as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    trainerId: "",
    locationId: "",
    capacity: 20,
    price: 0,
    schedules: [{ dayOfWeek: 1, startTime: "18:00", endTime: "19:00" }],
  });

  // Formulario para nueva ubicación
  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
  });

  // Cargar trainers según deporte y filtros activos (para filtros)
  const loadTrainers = useCallback(async () => {
    let url = "/api/trainers?active=true";
    if (filterSport !== "ALL") url += `&sport=${filterSport}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) setTrainers(data.trainers);
  }, [filterSport]);

  // ✅ NUEVO: Cargar TODOS los trainers activos (para modal de crear/editar)
  const loadAllTrainers = useCallback(async () => {
    const res = await fetch("/api/trainers?active=true");
    const data = await res.json();
    if (data.success) {
      setTrainers(data.trainers);
      console.log("👨‍🏫 Todos los entrenadores cargados:", data.trainers.length, "entrenadores");
    }
  }, []);

  // ✅ CORREGIDO: Cargar todas las ubicaciones disponibles
  // PROBLEMA ANTERIOR: Se usaba /api/enrollment/locations?sport=VOLLEYBALL que solo traía ubicaciones de voleibol
  // SOLUCIÓN: Cambiar a /api/locations que trae todas las ubicaciones disponibles
  const loadLocations = useCallback(async () => {
    const res = await fetch("/api/locations");
    const data = await res.json();
    if (data.success) {
      setLocations(data.locations);
      console.log("📍 Ubicaciones cargadas:", data.locations.length, "ubicaciones");
    }
  }, []);

  // Cargar estudiantes
  const loadStudents = useCallback(async () => {
    const res = await fetch("/api/students");
    const data = await res.json();
    if (data.success) setStudents(data.students);
  }, []);

  // ✅ NUEVO: Cargar transferencias de estudiantes
  const loadTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", transfersPagination.page.toString());
      params.set("limit", transfersPagination.limit.toString());
      if (transfersSearch.trim()) params.set("search", transfersSearch.trim());
      if (transfersDateRange?.from) {
        const year = transfersDateRange.from.getFullYear();
        const month = (transfersDateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = transfersDateRange.from.getDate().toString().padStart(2, '0');
        params.append("dateFrom", `${year}-${month}-${day}`);
      }
      if (transfersDateRange?.to) {
        const year = transfersDateRange.to.getFullYear();
        const month = (transfersDateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = transfersDateRange.to.getDate().toString().padStart(2, '0');
        params.append("dateTo", `${year}-${month}-${day}`);
      }

      const res = await fetch(`/api/admin/student-transfers?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setTransfers(data.transfers);
        setTransfersPagination(data.pagination);
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudieron cargar las transferencias",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading transfers:", error);
      toast({
        title: "❌ Error",
        description: "Error al cargar las transferencias",
        variant: "destructive",
      });
    } finally {
      setTransfersLoading(false);
    }
  }, [transfersPagination.page, transfersPagination.limit, transfersSearch, transfersDateRange, toast]);

  // ✅ OPTIMIZADO: Cargar clases paginadas y filtradas con loading separado
  const loadClasses = useCallback(async () => {
    setClassesLoading(true); // Solo loading de clases
    try {
      const params = new URLSearchParams();
      params.set("active", "true");
      params.set("page", currentPage.toString());
      params.set("pageSize", pageSize.toString());
      if (filterSport !== "ALL") params.set("sport", filterSport);
      if (filterTrainer !== "ALL") params.set("trainerId", filterTrainer);
      if (filterLocation !== "ALL") params.set("locationId", filterLocation);
      if (filterLevel !== "ALL") params.set("level", filterLevel);
      if (debouncedSearchQuery.trim()) params.set("search", debouncedSearchQuery.trim());
      const res = await fetch(`/api/classes?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes);
        setTotalClasses(data.total);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setClassesLoading(false); // Solo loading de clases
    }
  }, [currentPage, pageSize, filterSport, filterTrainer, filterLocation, filterLevel, debouncedSearchQuery]);

  // ✅ OPTIMIZADO: Efectos separados para evitar recargas innecesarias
  // Cargar datos iniciales solo una vez
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        loadLocations(),
        loadTrainers(),
        loadStudents(),
        loadClasses()
      ]);
      setLoading(false);
    };
    loadInitialData();
  }, []); // Solo se ejecuta una vez al montar el componente

  // ✅ OPTIMIZADO: Efecto separado para recargar trainers cuando cambia el filtro de deporte
  useEffect(() => {
    if (!loading) { // Solo si ya se cargaron los datos iniciales
      loadTrainers();
    }
  }, [filterSport, loadTrainers, loading]);

  // ✅ OPTIMIZADO: Efecto separado para recargar clases cuando cambian filtros o paginación
  useEffect(() => {
    if (!loading) { // Solo si ya se cargaron los datos iniciales
      loadClasses();
    }
  }, [currentPage, pageSize, filterSport, filterTrainer, filterLocation, filterLevel, debouncedSearchQuery, loading]);

  // ✅ NUEVO: Cargar todas las clases para el selector de eventos
  const loadAllClasses = useCallback(async () => {
    setAllClassesLoading(true);
    try {
      const res = await fetch("/api/classes?active=true&pageSize=1000"); // Cargar hasta 1000 clases
      const data = await res.json();
      if (data.success) {
        setAllClasses(data.classes);
        console.log("📚 Todas las clases cargadas para eventos:", data.classes.length, "clases");
      }
    } catch (error) {
      console.error("Error loading all classes:", error);
    } finally {
      setAllClassesLoading(false);
    }
  }, []);

  // ✅ NUEVO: Efecto para cargar transferencias cuando cambian los filtros
  useEffect(() => {
    if (activeTab === "transfers") {
      loadTransfers();
    }
  }, [activeTab, transfersPagination.page, transfersPagination.limit, transfersSearch, transfersDateRange, loadTransfers]);

  // ✅ NUEVO: Efecto para cargar todas las clases cuando se activa la pestaña de eventos
  useEffect(() => {
    if (activeTab === "events" && allClasses.length === 0) {
      loadAllClasses();
    }
  }, [activeTab, allClasses.length, loadAllClasses]);

  // ✅ OPTIMIZADO: Resetear página al cambiar filtros (sin searchQuery) - sin recargar todo
  useEffect(() => {
    if (!loading) { // Solo si ya se cargaron los datos iniciales
      setCurrentPage(1);
    }
  }, [filterSport, filterTrainer, filterLocation, filterLevel, loading]);

  // Debounced search - actualiza la búsqueda real después del delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // No resetear la página para evitar recargas innecesarias
      // setCurrentPage(1); // Comentado para evitar recarga completa
    }, 1000); // 1000ms delay (1 second)

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // ✅ NUEVO: Debounced search para estudiantes en el modal
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedStudentSearchQuery(studentSearchQuery);
    }, 500); // 500ms delay para búsqueda más rápida en el modal

    return () => clearTimeout(timeoutId);
  }, [studentSearchQuery]);

  // ✅ Crear nueva ubicación
  const createLocation = useCallback(async () => {
    if (!newLocation.name) {
      toast({
        title: "❌ Error",
        description: "El nombre de la ubicación es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLocation),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Ubicación creada",
          description: `${newLocation.name} ha sido creada exitosamente`,
        });
        setShowLocationDialog(false);

        // Agregar la nueva ubicación a la lista
        setLocations((prev) => [...prev, data.location]);

        // Reset form
        setNewLocation({ name: "", address: "" });
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo crear la ubicación",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating location:", error);
      toast({
        title: "❌ Error",
        description: "Error al crear la ubicación",
        variant: "destructive",
      });
    }
  }, [newLocation, toast]);

  // ✅ Función para abrir modal de edición
  const openEditDialog = useCallback(async (danceClass: DanceClass) => {
    setEditingClass(danceClass);
    setIsEditing(true);

    // ✅ NUEVO: Cargar TODOS los entrenadores para el modal
    await loadAllTrainers();

    // Precargar datos en el formulario
    setNewClass({
      name: danceClass.name,
      description: danceClass.description || "",
      sport: danceClass.sport,
      level: danceClass.level || "BEGINNER",
      trainerId: danceClass.trainer.id.toString(),
      locationId: danceClass.location?.id.toString() || "",
      capacity: danceClass.capacity,
      price: danceClass.price || 0,
      schedules: danceClass.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    });

    setShowCreateDialog(true);
  }, [loadAllTrainers]);

  // ✅ Función para cerrar el modal y limpiar estado
  const closeDialog = useCallback(() => {
    setShowCreateDialog(false);
    setIsEditing(false);
    setEditingClass(null);
    
    // ✅ NUEVO: Restaurar entrenadores filtrados cuando se cierra el modal
    loadTrainers();
    
    // Reset form
    setNewClass({
      name: "",
      description: "",
      sport: "DANCE",
      level: "BEGINNER",
      trainerId: "",
      locationId: "",
      capacity: 20,
      price: 0,
      schedules: [{ dayOfWeek: 1, startTime: "18:00", endTime: "19:00" }],
    });
  }, [loadTrainers]);

  // ✅ OPTIMIZACIÓN: createClass sin recargar todo
  const createClass = useCallback(async () => {
    if (!newClass.name || !newClass.trainerId) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (newClass.sport === "VOLLEYBALL" && !newClass.locationId) {
      toast({
        title: "❌ Error",
        description: "La ubicación es requerida para clases de voleibol",
        variant: "destructive",
      });
      return;
    }

    try {
      const classData = {
        ...newClass,
        trainerId: Number(newClass.trainerId),
        locationId:
          newClass.sport === "VOLLEYBALL"
            ? Number(newClass.locationId)
            : undefined,
      };

      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Clase creada",
          description:
            data.message || `${newClass.name} ha sido creada exitosamente`,
        });
        closeDialog();

        // ✅ OPTIMIZACIÓN: Solo agregar la nueva clase sin recargar
        const newClassWithDetails = {
          ...data.class,
          trainer: trainers.find((t) => t.id === Number(newClass.trainerId))!,
          location: newClass.locationId
            ? locations.find((l) => l.id === Number(newClass.locationId))
            : undefined,
          enrollments: [],
          _count: { enrollments: 0 },
        };
        setClasses((prev) => [...prev, newClassWithDetails]);
      } else {
        toast({
          title: data.error || "❌ Error",
          description:
            data.details || data.error || "No se pudo crear la clase",
          variant: "destructive",
          // Mostrar más tiempo si hay detalles de conflicto
          duration: data.details ? 8000 : 5000,
        });
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "❌ Error",
        description: "Error al crear la clase",
        variant: "destructive",
      });
    }
  }, [newClass, trainers, locations, toast]);

  // ✅ Actualizar clase existente
  const updateClass = useCallback(async () => {
    if (!editingClass || !newClass.name || !newClass.trainerId) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (newClass.sport === "VOLLEYBALL" && !newClass.locationId) {
      toast({
        title: "❌ Error",
        description: "La ubicación es requerida para clases de voleibol",
        variant: "destructive",
      });
      return;
    }

    try {
      const classData = {
        ...newClass,
        trainerId: Number(newClass.trainerId),
        locationId:
          newClass.sport === "VOLLEYBALL"
            ? Number(newClass.locationId)
            : undefined,
      };

      const response = await fetch(`/api/classes?id=${editingClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Clase actualizada",
          description: `${newClass.name} ha sido actualizada exitosamente`,
        });

        // ✅ OPTIMIZACIÓN: Actualizar la clase específica en la lista
        const updatedClassWithDetails = {
          ...data.class,
          trainer: trainers.find((t) => t.id === Number(newClass.trainerId))!,
          location: newClass.locationId
            ? locations.find((l) => l.id === Number(newClass.locationId))
            : undefined,
          enrollments: editingClass.enrollments, // Mantener las inscripciones existentes
          _count: editingClass._count, // Mantener el conteo existente
        };

        setClasses((prev) =>
          prev.map((cls) =>
            cls.id === editingClass.id ? updatedClassWithDetails : cls
          )
        );

        closeDialog();
      } else {
        toast({
          title: data.error || "❌ Error",
          description:
            data.details || data.error || "No se pudo actualizar la clase",
          variant: "destructive",
          // Mostrar más tiempo si hay detalles de conflicto
          duration: data.details ? 8000 : 5000,
        });
      }
    } catch (error) {
      console.error("Error updating class:", error);
      toast({
        title: "❌ Error",
        description: "Error al actualizar la clase",
        variant: "destructive",
      });
    }
  }, [editingClass, newClass, trainers, locations, toast]);

  // ✅ OPTIMIZACIÓN: enrollStudent sin recargar todo
  const enrollStudent = useCallback(
    async (studentId: number, classId: number) => {
      try {
        const response = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, classId }),
        });

        const data = await response.json();

        if (data.success) {
          const student = students.find((s) => s.id === studentId);
          toast({
            title: "✅ Inscripción exitosa",
            description: `${student?.name} ha sido inscrito en la clase`,
          });

          // ✅ OPTIMIZACIÓN: Solo actualizar la clase específica
          setClasses((prev) =>
            prev.map((cls) =>
              cls.id === classId
                ? {
                    ...cls,
                    enrollments: [
                      ...cls.enrollments,
                      { id: data.enrollment.id, student: student! },
                    ],
                    _count: { enrollments: cls._count.enrollments + 1 },
                  }
                : cls
            )
          );
          setShowEnrollDialog(false);
        } else {
          toast({
            title: "❌ Error",
            description: data.error || "No se pudo inscribir al estudiante",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error enrolling student:", error);
        toast({
          title: "❌ Error",
          description: "Error al inscribir al estudiante",
          variant: "destructive",
        });
      }
    },
    [students, toast]
  );

  // ✅ NUEVO: Función para abrir modal de confirmación de eliminación de clase
  const openDeleteClassDialog = useCallback((danceClass: DanceClass) => {
    setClassToDelete(danceClass);
    setShowDeleteClassDialog(true);
  }, []);

  // ✅ OPTIMIZADO: deleteClass con modal de confirmación
  const deleteClass = useCallback(
    async (classId: number) => {
      try {
        const response = await fetch(`/api/classes/${classId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: "✅ Clase eliminada",
            description: "La clase ha sido eliminada exitosamente",
          });

          // ✅ OPTIMIZACIÓN: Solo remover la clase específica
          setClasses((prev) => prev.filter((cls) => cls.id !== classId));
        } else {
          toast({
            title: "❌ Error",
            description: data.error || "No se pudo eliminar la clase",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting class:", error);
        toast({
          title: "❌ Error",
          description: "Error al eliminar la clase",
          variant: "destructive",
        });
      } finally {
        setShowDeleteClassDialog(false);
        setClassToDelete(null);
      }
    },
    [toast]
  );

  // Funciones auxiliares para horarios
  const addSchedule = () => {
    setNewClass({
      ...newClass,
      schedules: [
        ...newClass.schedules,
        { dayOfWeek: 1, startTime: "18:00", endTime: "19:00" },
      ],
    });
  };

  const removeSchedule = (index: number) => {
    if (newClass.schedules.length > 1) {
      setNewClass({
        ...newClass,
        schedules: newClass.schedules.filter((_, i) => i !== index),
      });
    }
  };

  const updateSchedule = (
    index: number,
    field: keyof ClassSchedule,
    value: any
  ) => {
    const updated = newClass.schedules.map((schedule, i) =>
      i === index ? { ...schedule, [field]: value } : schedule
    );
    setNewClass({ ...newClass, schedules: updated });
  };

  // Total de páginas
  const totalPages = Math.ceil(totalClasses / pageSize);

  // ✅ NUEVO: Funciones auxiliares para transferencias
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSportBadgeColor = (sport: string) => {
    return sport === "DANCE" ? "bg-purple-600" : "bg-blue-600";
  };

  const getSportLabel = (sport: string) => {
    return sport === "DANCE" ? "Baile" : "Voleibol";
  };

  const handleTransfersPageChange = (page: number) => {
    setTransfersPagination(prev => ({ ...prev, page }));
  };

  const handleTransfersLimitChange = (limit: number) => {
    setTransfersPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  const clearTransfersFilters = () => {
    setTransfersSearch("");
    setTransfersDateRange(undefined);
    setTransfersPagination(prev => ({ ...prev, page: 1 }));
  };

  // ✅ NUEVO: Función para exportar clases a Excel
  const handleExportClassesExcel = async () => {
    try {
      setIsDownloadingClasses(true);
      
      const response = await fetch('/api/classes/export-excel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar clases');
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Obtener nombre del archivo desde los headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'clases.xlsx';
      if (contentDisposition) {
        const filenameRegex = /filename="(.+)"/
        const filenameMatch = filenameRegex.exec(contentDisposition);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "✅ Archivo descargado",
        description: `Archivo ${filename} descargado exitosamente`,
      });
    } catch (error) {
      console.error('Error downloading classes Excel file:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error al descargar archivo Excel',
        variant: "destructive",
      });
    } finally {
      setIsDownloadingClasses(false);
    }
  };

  // ✅ NUEVO: Función para exportar transferencias a Excel
  const handleExportTransfersExcel = async () => {
    try {
      // ✅ VALIDACIÓN: Verificar que hay al menos un filtro de fecha
      if (!transfersDateRange?.from && !transfersDateRange?.to) {
        toast({
          title: "⚠️ Filtro de fecha requerido",
          description: "Debe seleccionar al menos una fecha (desde o hasta) para exportar las transferencias",
          variant: "destructive",
        });
        return;
      }

      setIsDownloadingTransfers(true);
      
      // Construir parámetros de consulta basados en los filtros actuales
      const params = new URLSearchParams();
      
      if (transfersSearch.trim()) {
        params.set('search', transfersSearch.trim());
      }
      
      if (transfersDateRange?.from) {
        const year = transfersDateRange.from.getFullYear();
        const month = (transfersDateRange.from.getMonth() + 1).toString().padStart(2, '0');
        const day = transfersDateRange.from.getDate().toString().padStart(2, '0');
        params.set('dateFrom', `${year}-${month}-${day}`);
      }
      
      if (transfersDateRange?.to) {
        const year = transfersDateRange.to.getFullYear();
        const month = (transfersDateRange.to.getMonth() + 1).toString().padStart(2, '0');
        const day = transfersDateRange.to.getDate().toString().padStart(2, '0');
        params.set('dateTo', `${year}-${month}-${day}`);
      }
      
      const response = await fetch(`/api/admin/student-transfers/export-excel?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar transferencias');
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Obtener nombre del archivo desde los headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'transferencias.xlsx';
      if (contentDisposition) {
        const filenameRegex = /filename="(.+)"/
        const filenameMatch = filenameRegex.exec(contentDisposition);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "✅ Archivo descargado",
        description: `Archivo ${filename} descargado exitosamente`,
      });
    } catch (error) {
      console.error('Error downloading transfers Excel file:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error al descargar archivo Excel',
        variant: "destructive",
      });
    } finally {
      setIsDownloadingTransfers(false);
    }
  };

  // Helper function to get user display name
  const getUserDisplayName = (user: StudentTransfer['user']) => {
    return user.student?.name || user.trainer?.name || user.email;
  };

  // ✅ NUEVO: Función para manejar la selección de clases
  const handleClassSelection = (classId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedClasses(prev => [...prev, classId]);
    } else {
      setSelectedClasses(prev => prev.filter(id => id !== classId));
    }
  };

  // ✅ NUEVO: Función para seleccionar/deseleccionar todas las clases
  const handleSelectAllClasses = () => {
    if (selectedClasses.length === allClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(allClasses.map(cls => cls.id.toString()));
    }
  };

  // ✅ NUEVO: Función para seleccionar todas las clases de baile
  const handleSelectDanceClasses = () => {
    const danceClassIds = allClasses
      .filter(cls => cls.sport === "DANCE")
      .map(cls => cls.id.toString());
    
    // Si ya están todas las de baile seleccionadas, las deselecciona
    const allDanceSelected = danceClassIds.every(id => selectedClasses.includes(id));
    
    if (allDanceSelected) {
      setSelectedClasses(prev => prev.filter(id => !danceClassIds.includes(id)));
    } else {
      setSelectedClasses(prev => {
        const newSelection = [...prev];
        danceClassIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // ✅ NUEVO: Función para seleccionar todas las clases de voleibol
  const handleSelectVolleyballClasses = () => {
    const volleyballClassIds = allClasses
      .filter(cls => cls.sport === "VOLLEYBALL")
      .map(cls => cls.id.toString());
    
    // Si ya están todas las de voleibol seleccionadas, las deselecciona
    const allVolleyballSelected = volleyballClassIds.every(id => selectedClasses.includes(id));
    
    if (allVolleyballSelected) {
      setSelectedClasses(prev => prev.filter(id => !volleyballClassIds.includes(id)));
    } else {
      setSelectedClasses(prev => {
        const newSelection = [...prev];
        volleyballClassIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // ✅ NUEVO: Función para enviar mensaje del evento
  const [isSendingEvent, setIsSendingEvent] = useState(false);
  
  const sendEventMessage = useCallback(async () => {
    if (!eventData.name || !eventData.date || !eventData.time || !eventData.location || selectedClasses.length === 0) {
      toast({
        title: "❌ Error",
        description: "Complete todos los campos requeridos y seleccione al menos una clase",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEvent(true);
    try {
      const response = await fetch('/api/events/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName: eventData.name,
          eventDate: eventData.date,
          eventTime: eventData.time,
          eventLocation: eventData.location,
          eventDescription: eventData.description,
          additionalInfo: eventData.additionalInfo,
          classIds: selectedClasses.map(id => parseInt(id))
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Mensajes enviados",
          description: `${data.summary.successCount} mensajes enviados exitosamente a ${data.summary.totalStudents} estudiantes${data.summary.errorCount > 0 ? ` (${data.summary.errorCount} errores)` : ''}`,
          duration: 5000,
        });
        
        // Limpiar formulario después del envío exitoso
        setEventData({
          name: "",
          date: "",
          time: "",
          location: "",
          description: "",
          additionalInfo: ""
        });
        setSelectedClasses([]);
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudieron enviar los mensajes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending event message:', error);
      toast({
        title: "❌ Error",
        description: "Error al enviar los mensajes del evento",
        variant: "destructive",
      });
    } finally {
      setIsSendingEvent(false);
    }
  }, [eventData, selectedClasses, toast]);

  // ✅ NUEVO: Función para generar el mensaje del evento
  const generateEventMessage = () => {
    const { name, date, time, location, description, additionalInfo } = eventData;
    
    if (!name || !date || !time || !location) {
      return "Complete los campos requeridos para ver la vista previa del mensaje";
    }

    const eventDate = new Date(date);
    const formattedDate = eventDate.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    let message = `Hola✨\n\n`;
    message += `Te recordamos que te estaremos esperando en ${name}\n\n`;
    message += `*Fecha:* ${formattedDate}\n`;
    message += `*Hora:* ${time}\n`;
    message += `*Lugar:* ${location}\n\n`;
    
    if (description) {
      message += `📝 *Descripción:*\n${description}\n\n`;
    }
    
    if (additionalInfo) {
      message += `ℹ️ *Información adicional:*\n${additionalInfo}\n\n`;
    }
    
    message += `¡Esperamos nos puedas acompañar!😍 🎊\n\n`;

    return message;
  };


  // Helper function to render transfers content
  const renderTransfersContent = () => {
    if (transfersLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (transfers.length === 0) {
      return (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No hay transferencias para mostrar</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-600">
              <TableHead className="text-gray-300">Estudiante</TableHead>
              <TableHead className="text-gray-300">Clase de Origen</TableHead>
              <TableHead className="text-gray-300">Clase de Destino</TableHead>
              <TableHead className="text-gray-300">Transferido por</TableHead>
              <TableHead className="text-gray-300">Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id} className="border-gray-600">
                {/* Estudiante */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {transfer.student.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {transfer.student.phone}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Clase de Origen */}
                <TableCell>
                  <div className="space-y-1">
                    <Badge className={`${getSportBadgeColor(transfer.fromClass.sport)} text-white text-xs`}>
                      {getSportLabel(transfer.fromClass.sport)}
                    </Badge>
                    <p className="text-sm font-medium text-white truncate">
                      {transfer.fromClass.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {transfer.fromClass.trainer.name}
                    </p>
                  </div>
                </TableCell>

                {/* Clase de Destino */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getSportBadgeColor(transfer.toClass.sport)} text-white text-xs`}>
                        {getSportLabel(transfer.toClass.sport)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-white truncate">
                      {transfer.toClass.name.split(' - ')[0]}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {transfer.toClass.trainer.name}
                    </p>
                  </div>
                </TableCell>

                {/* Transferido por */}
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white truncate">
                      {getUserDisplayName(transfer.user)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(transfer.transferredAt)}
                    </p>
                  </div>
                </TableCell>


                {/* Motivo */}
                <TableCell>
                  <div className="text-sm text-gray-400">
                    {transfer.reason ? (
                      <span className="italic">"{transfer.reason}"</span>
                    ) : (
                      <span className="text-gray-500">Sin motivo</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // ✅ OPTIMIZADO: Memorizar estudiantes disponibles para inscripción con búsqueda
  const availableStudents = useMemo(() => {
    if (!selectedClass) return [];
    const enrolledIds = selectedClass.enrollments.map((e) => e.student.id);
    const filteredStudents = students.filter((student) => !enrolledIds.includes(student.id));
    
    // Aplicar filtro de búsqueda si hay query
    if (debouncedStudentSearchQuery.trim()) {
      const searchTerm = debouncedStudentSearchQuery.trim().toLowerCase();
      return filteredStudents.filter((student) => 
        student.name.toLowerCase().includes(searchTerm) ||
        student.id.toString().includes(searchTerm) ||
        student.user?.email?.toLowerCase().includes(searchTerm) ||
        student.phone.includes(searchTerm)
      );
    }
    
    return filteredStudents;
  }, [students, selectedClass, debouncedStudentSearchQuery]);

  // ✅ NUEVO: Función para abrir modal de confirmación de eliminación de inscripción
  const openDeleteEnrollmentDialog = useCallback((
    enrollmentId: number, 
    classId: number, 
    studentName: string, 
    className: string
  ) => {
    setEnrollmentToDelete({
      enrollmentId,
      classId,
      studentName,
      className
    });
    setShowDeleteEnrollmentDialog(true);
  }, []);

  // ✅ OPTIMIZADO: Eliminar inscripción con modal de confirmación
  const removeEnrollment = useCallback(
    async (enrollmentId: number, classId: number) => {
      try {
        const response = await fetch("/api/enrollments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: enrollmentId }),
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: "✅ Inscripción eliminada",
            description: "El estudiante ha sido retirado de la clase",
          });

          // Actualizar estado local
          setClasses((prev) =>
            prev.map((cls) =>
              cls.id === classId
                ? {
                    ...cls,
                    enrollments: cls.enrollments.filter(
                      (e) => e.id !== enrollmentId
                    ),
                    _count: { enrollments: cls._count.enrollments - 1 },
                  }
                : cls
            )
          );

          // Si estamos viendo la clase actual en el modal, actualizar también
          if (selectedClass && selectedClass.id === classId) {
            setSelectedClass({
              ...selectedClass,
              enrollments: selectedClass.enrollments.filter(
                (e) => e.id !== enrollmentId
              ),
              _count: { enrollments: selectedClass._count.enrollments - 1 },
            });
          }
        } else {
          toast({
            title: "❌ Error",
            description: data.error || "No se pudo eliminar la inscripción",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error removing enrollment:", error);
        toast({
          title: "❌ Error",
          description: "Error al eliminar la inscripción",
          variant: "destructive",
        });
      } finally {
        setShowDeleteEnrollmentDialog(false);
        setEnrollmentToDelete(null);
      }
    },
    [toast, setClasses, selectedClass]
  );

  // Crear objeto de paginación para AdvancedPagination
  const paginationInfo = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    totalCount: totalClasses,
    totalPages: totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  }), [currentPage, pageSize, totalClasses, totalPages]);

  // ✅ OPTIMIZADO: Loading inicial solo para la primera carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-2 sm:px-4 md:px-6">
      {/* Pestañas principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-800 border border-gray-600">
          <TabsTrigger 
            value="classes" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Gestión de Clases
          </TabsTrigger>
          <TabsTrigger 
            value="transfers" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            <History className="h-4 w-4 mr-2" />
            Transferencias
          </TabsTrigger>
          <TabsTrigger 
            value="events" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Gestión de Eventos
          </TabsTrigger>
        </TabsList>

        {/* Pestaña de Gestión de Clases */}
        <TabsContent value="classes" className="space-y-6">
          {/* Card de Filtros */}
          <Card className="border-0 bg-gray-800/90 text-white shadow-2xl mb-6 sm:mb-8 rounded-3xl border border-gray-600">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Deporte</Label>
              <Select value={filterSport} onValueChange={setFilterSport}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="DANCE">Baile</SelectItem>
                  <SelectItem value="VOLLEYBALL">Voleibol</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Instructor/Entrenador</Label>
              <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Nivel</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-gray-300">Ubicación</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px] sm:max-w-[220px]">
              <Label className="text-gray-300">Buscar Clase</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar clases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white pl-10 pr-10 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Botones de Acción - Layout mejorado */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={handleExportClassesExcel}
                disabled={isDownloadingClasses}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-400 hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-medium flex-1 sm:flex-none"
              >
                {isDownloadingClasses ? (
                  <>
                    <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-1" />
                    <span className="hidden sm:inline">Descargando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Exportar Excel</span>
                    <span className="sm:hidden">Excel</span>
                  </>
                )}
              </Button>
              
              <Dialog
                open={showCreateDialog}
                onOpenChange={(open) => {
                  if (!open) closeDialog();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={async () => {
                      // ✅ NUEVO: Cargar TODOS los entrenadores al abrir modal de creación
                      await loadAllTrainers();
                      setShowCreateDialog(true);
                    }}
                    size="sm"
                    className="bg-blue-600/60 hover:bg-blue-700/60 border border-blue-500 text-white px-3 py-2 rounded-lg hover:text-white backdrop-blur-sm text-xs font-medium flex-1 sm:flex-none"
                  >
                    <Plus className="w-3 h-3 mr-1 text-white" />
                    <span className="hidden sm:inline">Nueva Clase</span>
                    <span className="sm:hidden">Nueva</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full sm:!w-[95vw] sm:!max-w-5xl h-[90vh] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-gray-800 border border-gray-600 text-white !left-1/2 !-translate-x-1/2">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">
                      {isEditing ? "Editar Clase" : "Crear Nueva Clase"} de{" "}
                      {newClass.sport === "DANCE" ? "Baile" : "Voleibol"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 p-2">
                    {/* Información básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-300 font-medium">
                            Nombre de la Clase *
                          </Label>
                          <Input
                            value={newClass.name}
                            onChange={(e) =>
                              setNewClass({ ...newClass, name: e.target.value })
                            }
                            placeholder="Ej: Salsa Principiantes"
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-gray-300 font-medium">
                            Descripción
                          </Label>
                          <Textarea
                            value={newClass.description}
                            onChange={(e) =>
                              setNewClass({
                                ...newClass,
                                description: e.target.value,
                              })
                            }
                            placeholder="Descripción de la clase..."
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label className="text-gray-300 font-medium">
                            Deporte *
                          </Label>
                          <Select
                            value={newClass.sport}
                            onValueChange={(value: "DANCE" | "VOLLEYBALL") =>
                              setNewClass({ ...newClass, sport: value })
                            }
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SPORT_OPTIONS.map((sport) => (
                                <SelectItem
                                  key={sport.value}
                                  value={sport.value}
                                >
                                  <div className="flex items-center space-x-2">
                                    <sport.icon className="h-4 w-4" />
                                    <span>{sport.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-gray-300 font-medium">
                            Nivel
                          </Label>
                          <Select
                            value={newClass.level}
                            onValueChange={(
                              value: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
                            ) => setNewClass({ ...newClass, level: value })}
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEVEL_OPTIONS.map((level) => (
                                <SelectItem
                                  key={level.value}
                                  value={level.value}
                                >
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-300 font-medium">
                            Instructor/Entrenador *
                          </Label>
                          <Select
                            value={newClass.trainerId}
                            onValueChange={(value) =>
                              setNewClass({ ...newClass, trainerId: value })
                            }
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                              <SelectValue placeholder="Seleccionar instructor" />
                            </SelectTrigger>
                            <SelectContent>
                              {trainers.map((trainer) => (
                                <SelectItem
                                  key={trainer.id}
                                  value={trainer.id.toString()}
                                >
                                  {trainer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {newClass.sport === "VOLLEYBALL" && (
                          <div>
                            <Label className="text-gray-300 font-medium">
                              Ubicación *
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Select
                                value={newClass.locationId}
                                onValueChange={(value) =>
                                  setNewClass({
                                    ...newClass,
                                    locationId: value,
                                  })
                                }
                              >
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white flex-1">
                                  <SelectValue placeholder="Seleccionar ubicación" />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations.map((location) => (
                                    <SelectItem
                                      key={location.id}
                                      value={location.id.toString()}
                                    >
                                      {location.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Dialog
                                open={showLocationDialog}
                                onOpenChange={setShowLocationDialog}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-gray-600 text-gray-300 hover:bg-gray-700 px-3"
                                  >
                                    <Building className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-800 border border-gray-600 text-white">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">
                                      Nueva Ubicación
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-gray-300">
                                        Nombre *
                                      </Label>
                                      <Input
                                        value={newLocation.name}
                                        onChange={(e) =>
                                          setNewLocation({
                                            ...newLocation,
                                            name: e.target.value,
                                          })
                                        }
                                        placeholder="Nombre de la ubicación"
                                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">
                                        Dirección
                                      </Label>
                                      <Input
                                        value={newLocation.address}
                                        onChange={(e) =>
                                          setNewLocation({
                                            ...newLocation,
                                            address: e.target.value,
                                          })
                                        }
                                        placeholder="Dirección (opcional)"
                                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                                      />
                                    </div>
                                    <Button
                                      onClick={createLocation}
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      Crear Ubicación
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300 font-medium">
                              Capacidad
                            </Label>
                            <Input
                              type="number"
                              value={newClass.capacity}
                              onChange={(e) =>
                                setNewClass({
                                  ...newClass,
                                  capacity: Number(e.target.value),
                                })
                              }
                              min="1"
                              max="100"
                              className="bg-gray-700 border-gray-600 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 font-medium">
                              Precio ($)
                            </Label>
                            <Input
                              type="number"
                              value={newClass.price}
                              onChange={(e) =>
                                setNewClass({
                                  ...newClass,
                                  price: Number(e.target.value),
                                })
                              }
                              min="0"
                              step="0.01"
                              className="bg-gray-700 border-gray-600 text-white mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="border-t border-gray-600 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">
                          Horarios de Clase
                        </h3>
                        <Button
                          type="button"
                          onClick={addSchedule}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Horario
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {newClass.schedules.map((schedule, index) => (
                          <div
                            key={index}
                            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex-1">
                              <Label className="text-gray-300 text-sm">
                                Día
                              </Label>
                              <Select
                                value={schedule.dayOfWeek.toString()}
                                onValueChange={(value) =>
                                  updateSchedule(
                                    index,
                                    "dayOfWeek",
                                    Number(value)
                                  )
                                }
                              >
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DAYS_OF_WEEK.map((day, dayIndex) => (
                                    <SelectItem
                                      key={dayIndex}
                                      value={dayIndex.toString()}
                                    >
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex-1">
                              <Label className="text-gray-300 text-sm">
                                Hora Inicio
                              </Label>
                              <Input
                                type="time"
                                value={schedule.startTime}
                                onChange={(e) =>
                                  updateSchedule(
                                    index,
                                    "startTime",
                                    e.target.value
                                  )
                                }
                                className="bg-gray-700 border-gray-600 text-white mt-1"
                              />
                            </div>

                            <div className="flex-1">
                              <Label className="text-gray-300 text-sm">
                                Hora Fin
                              </Label>
                              <Input
                                type="time"
                                value={schedule.endTime}
                                onChange={(e) =>
                                  updateSchedule(
                                    index,
                                    "endTime",
                                    e.target.value
                                  )
                                }
                                className="bg-gray-700 border-gray-600 text-white mt-1"
                              />
                            </div>

                            {newClass.schedules.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeSchedule(index)}
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-400 hover:bg-red-950 mt-6"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={isEditing ? updateClass : createClass}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={
                          !newClass.name ||
                          !newClass.trainerId ||
                          (newClass.sport === "VOLLEYBALL" &&
                            !newClass.locationId)
                        }
                      >
                        {isEditing ? (
                          <Edit className="h-4 w-4 mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {isEditing ? "Actualizar Clase" : "Crear Clase"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de clases paginada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {renderClassesList(
          classes,
          classesLoading, // ✅ OPTIMIZADO: Usar loading específico de clases
          openDeleteClassDialog, // ✅ NUEVO: Usar función de modal en lugar de deleteClass directo
          setSelectedClass,
          setShowEnrollDialog,
          setViewingEnrolled,
          openEditDialog
        )}
      </div>

      {/* Paginación */}
      <AdvancedPagination
        pagination={paginationInfo}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        onLimitChange={(limit) => {
          setPageSize(limit);
          setCurrentPage(1);
        }}
        itemName="clases"
        limitOptions={[6, 12, 18, 24, 30]}
      />

            {/* ✅ NUEVO: Modal de inscripción de estudiantes */}
      <EnrollmentModal
        open={showEnrollDialog}
        onOpenChange={(open) => {
          setShowEnrollDialog(open);
          if (!open) {
            setViewingEnrolled(false);
            // Limpiar búsqueda al cerrar el modal
            setStudentSearchQuery("");
            setDebouncedStudentSearchQuery("");
          }
        }}
        selectedClass={selectedClass}
        viewingEnrolled={viewingEnrolled}
        availableStudents={availableStudents}
        enrolledStudents={selectedClass?.enrollments || []}
        studentSearchQuery={studentSearchQuery}
        onStudentSearchChange={setStudentSearchQuery}
        onEnrollStudent={enrollStudent}
        onRemoveEnrollment={openDeleteEnrollmentDialog}
      />

      {/* ✅ NUEVO: Modal de confirmación para eliminar clase */}
      <DeleteClassConfirmationModal
        open={showDeleteClassDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteClassDialog(false);
            setClassToDelete(null);
          }
        }}
        classToDelete={classToDelete}
        onConfirm={() => classToDelete && deleteClass(classToDelete.id)}
      />

      {/* ✅ NUEVO: Modal de confirmación para eliminar inscripción */}
      <DeleteEnrollmentConfirmationModal
        open={showDeleteEnrollmentDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteEnrollmentDialog(false);
            setEnrollmentToDelete(null);
          }
        }}
        enrollmentToDelete={enrollmentToDelete}
        onConfirm={() => 
          enrollmentToDelete && 
          removeEnrollment(enrollmentToDelete.enrollmentId, enrollmentToDelete.classId)
        }
      />
        </TabsContent>

        {/* Pestaña de Transferencias */}
        <TabsContent value="transfers" className="space-y-6">
          {/* Card de Filtros para Transferencias */}
          <Card className="border-0 bg-gray-800/90 text-white shadow-2xl mb-6 sm:mb-8 rounded-3xl border border-gray-600">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-gray-300">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por estudiante, clase, profesor..."
                      value={transfersSearch}
                      onChange={(e) => setTransfersSearch(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white pl-10 pr-10 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    {transfersSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTransfersSearch("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label className="text-gray-300">Rango de Fechas</Label>
                  <DateRangePicker
                    dateRange={transfersDateRange}
                    onDateRangeChange={setTransfersDateRange}
                    placeholder="Seleccionar rango de fechas"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleExportTransfersExcel}
                    disabled={isDownloadingTransfers || (!transfersDateRange?.from && !transfersDateRange?.to)}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-400 hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-medium flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                    title={(!transfersDateRange?.from && !transfersDateRange?.to) ? "Seleccione al menos una fecha para exportar" : "Exportar transferencias filtradas"}
                  >
                    {isDownloadingTransfers ? (
                      <>
                        <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-1" />
                        <span className="hidden sm:inline">Descargando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Exportar Excel</span>
                        <span className="sm:hidden">Excel</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={clearTransfersFilters}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-lg text-xs font-medium flex-1 sm:flex-none"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Limpiar Filtros</span>
                    <span className="sm:hidden">Limpiar</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Transferencias */}
          <Card className="border-0 bg-gray-800/90 border border-gray-600 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-400" />
                  Historial de Transferencias
                </h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {transfersPagination.total} transferencias
                </Badge>
              </div>

              {renderTransfersContent()}

              {/* Paginación para transferencias */}
              {transfers.length > 0 && (
                <div className="mt-6">
                  <AdvancedPagination
                    pagination={{
                      page: transfersPagination.page,
                      limit: transfersPagination.limit,
                      totalCount: transfersPagination.total,
                      totalPages: transfersPagination.totalPages,
                      hasNext: transfersPagination.hasNext,
                      hasPrev: transfersPagination.hasPrev
                    }}
                    currentPage={transfersPagination.page}
                    onPageChange={handleTransfersPageChange}
                    onLimitChange={handleTransfersLimitChange}
                    itemName="transferencias"
                    limitOptions={[25, 50, 100]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Gestión de Eventos */}
        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de Evento */}
            <Card className="border-0 bg-gray-800/90 text-white shadow-2xl rounded-3xl border border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <CalendarDays className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Crear Evento</h3>
                </div>

                <div className="space-y-4">
                  {/* Nombre del evento */}
                  <div>
                    <Label className="text-gray-300 font-medium">
                      Nombre del Evento * (máx. 60 caracteres)
                    </Label>
                    <Input
                      value={eventData.name}
                      onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                      placeholder="Ej: Competencia de Baile 2024"
                      maxLength={60}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {eventData.name.length}/60 caracteres
                    </p>
                  </div>

                  {/* Fecha y hora */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 font-medium">
                        Fecha del Evento *
                      </Label>
                      <Input
                        type="date"
                        value={eventData.date}
                        onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 font-medium">
                        Hora del Evento *
                      </Label>
                      <Input
                        type="time"
                        value={eventData.time}
                        onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white mt-1"
                      />
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div>
                    <Label className="text-gray-300 font-medium">
                      Lugar del Evento * (máx. 60 caracteres)
                    </Label>
                    <Input
                      value={eventData.location}
                      onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                      placeholder="Ej: Centro Deportivo Municipal"
                      maxLength={60}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {eventData.location.length}/60 caracteres
                    </p>
                  </div>

                  {/* Descripción */}
                  <div>
                    <Label className="text-gray-300 font-medium">
                      Descripción del Evento (máx. 100 caracteres)
                    </Label>
                    <Textarea
                      value={eventData.description}
                      onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                      placeholder="Describe los detalles del evento, qué incluye, requisitos, etc."
                      maxLength={100}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {eventData.description.length}/100 caracteres
                    </p>
                  </div>

                  {/* Información adicional */}
                  <div>
                    <Label className="text-gray-300 font-medium">
                      Información Adicional (máx. 100 caracteres)
                    </Label>
                    <Textarea
                      value={eventData.additionalInfo}
                      onChange={(e) => setEventData({ ...eventData, additionalInfo: e.target.value })}
                      placeholder="Información extra como costo, requisitos de vestimenta, etc."
                      maxLength={100}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
                      rows={2}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {eventData.additionalInfo.length}/100 caracteres
                    </p>
                  </div>

                  {/* Selección de clases */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-gray-300 font-medium">
                        Clases Destinatarias *
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectDanceClasses}
                          className="border-purple-600 text-purple-300 hover:bg-purple-900/50 text-xs"
                        >
                          💃 Baile
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectVolleyballClasses}
                          className="border-blue-600 text-blue-300 hover:bg-blue-900/50 text-xs"
                        >
                          🏐 Voleibol
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllClasses}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                        >
                          {selectedClasses.length === allClasses.length ? "Deseleccionar Todas" : "Seleccionar Todas"}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700 p-3">
                      {allClassesLoading ? (
                        <div className="flex justify-center items-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-gray-400 text-sm">Cargando clases...</span>
                        </div>
                      ) : allClasses.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">
                          No hay clases disponibles
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {allClasses.map((danceClass) => (
                            <div
                              key={danceClass.id}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-600/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                id={`class-${danceClass.id}`}
                                checked={selectedClasses.includes(danceClass.id.toString())}
                                onChange={(e) => handleClassSelection(danceClass.id.toString(), e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <label
                                htmlFor={`class-${danceClass.id}`}
                                className="flex-1 cursor-pointer text-sm text-white"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`${getSportBadgeClass(danceClass.sport)} text-xs`}
                                  >
                                    {getSportLabel(danceClass.sport)}
                                  </Badge>
                                  <span className="font-medium">{danceClass.name}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {danceClass.trainer.name} • {danceClass._count.enrollments} estudiantes
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-400">
                        {selectedClasses.length} de {allClasses.length} clases seleccionadas
                      </p>
                      {selectedClasses.length > 0 && (
                        <div className="flex gap-4 text-xs">
                          <span className="text-purple-300">
                            💃 Baile: {selectedClasses.filter(id => {
                              const cls = allClasses.find(c => c.id.toString() === id);
                              return cls?.sport === "DANCE";
                            }).length}
                          </span>
                          <span className="text-blue-300">
                            🏐 Voleibol: {selectedClasses.filter(id => {
                              const cls = allClasses.find(c => c.id.toString() === id);
                              return cls?.sport === "VOLLEYBALL";
                            }).length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => {
                        setEventData({
                          name: "",
                          date: "",
                          time: "",
                          location: "",
                          description: "",
                          additionalInfo: ""
                        });
                        setSelectedClasses([]);
                      }}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1"
                    >
                      Limpiar Formulario
                    </Button>
                    <Button
                      onClick={sendEventMessage}
                      disabled={!eventData.name || !eventData.date || !eventData.time || !eventData.location || selectedClasses.length === 0 || isSendingEvent}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      {isSendingEvent ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Enviar Mensaje
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vista Previa del Mensaje */}
            <Card className="border-0 bg-gray-800/90 text-white shadow-2xl rounded-3xl border border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Vista Previa del Mensaje</h3>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">WhatsApp</p>
                      <p className="text-xs text-gray-400">Ahora</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-600">
                    <div className="whitespace-pre-wrap text-sm text-gray-200 font-mono">
                      {generateEventMessage()}
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Destinatarios:</strong> El mensaje se enviará a los estudiantes de {selectedClasses.length} clase{selectedClasses.length !== 1 ? 's' : ''} seleccionada{selectedClasses.length !== 1 ? 's' : ''}.
                  </p>
                  {selectedClasses.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-blue-300 font-medium">Clases seleccionadas:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedClasses.map(classId => {
                          const danceClass = allClasses.find(cls => cls.id.toString() === classId);
                          return danceClass ? (
                            <Badge
                              key={classId}
                              className={`${getSportBadgeClass(danceClass.sport)} text-xs`}
                            >
                              {danceClass.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
