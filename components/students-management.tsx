"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Eye,
  Edit,
  Power,
  PowerOff,
  Trash2,
  MapPin,
  Users,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  IdCard,
  Heart,
  AlertTriangle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StudentDetailModal } from "@/components/student-detail-modal";
import EditStudentModal from "@/components/edit-student-modal";
import { AdvancedPagination } from "./ui/advanced-pagination";

interface Student {
  id: number
  name: string
  phone: string
  hasDebt: boolean
  isActive: boolean
  avatar?: string
  user?: { 
    email: string
  }
}

interface ClassEnrollment {
  id: number;
  studentId: number;
  classId: number;
  isActive: boolean;
  createdAt: string;
  student: Student;
  danceClass: {
    id: number;
    name: string;
    type: string;
    trainer: {
      name: string;
    };
    location?: {
      name: string;
      address?: string;
    };
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function StudentsManagement() {
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    activeStudents: 0,
    inactiveStudents: 0,
    studentsWithDebt: 0
  });
  const [selectedStudent, setSelectedStudent] =
    useState<ClassEnrollment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { toast } = useToast();

  // Función helper para convertir Student local a Student del modal
  const convertStudentForModal = (localStudent: Student) => ({
    id: localStudent.id.toString(),
    name: localStudent.name,
    email: localStudent.user?.email || '',
    phone: localStudent.phone,
    documentNumber: localStudent.id.toString(),
    city: "Itagüí",
    monthlyFee: 0,
    avatar: localStudent.avatar || '',
    isActive: localStudent.isActive, // <-- Añadido para pasar el estado activo/inactivo
    // Puedes agregar más campos si los necesitas en el modal
  });

  const loadEnrollments = async (
    page = 1,
    search = "",
    status = "all",
    limit = pagination.limit
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: status,
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/api/enrollments?${params}`);
      const data = await response.json();

      if (data.success) {
        setEnrollments(data.enrollments);
        setPagination(data.pagination);
        // Guardar las estadísticas generales
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los estudiantes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading enrollments:", error);
      toast({
        title: "Error",
        description: "Error al cargar los estudiantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments(currentPage, searchTerm, statusFilter);
  }, [currentPage, statusFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadEnrollments(1, searchTerm, statusFilter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleLimitChange = (newLimit: number) => {
    setCurrentPage(1)
    loadEnrollments(1, searchTerm, statusFilter, newLimit)
  }

  const handleToggleStatus = async (enrollment: ClassEnrollment) => {
    try {
      // Actualizar el estado del estudiante en lugar del estado de la inscripción
      const response = await fetch("/api/students/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: enrollment.student.id.toString(),
          name: enrollment.student.name,
          phone: enrollment.student.phone,
          email: enrollment.student.user?.email || '',
          isActive: !enrollment.student.isActive
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Estudiante ${
            !enrollment.student.isActive ? "activado" : "desactivado"
          } correctamente`,
        });
        loadEnrollments(currentPage, searchTerm, statusFilter);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo actualizar el estado",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error toggling student status:", error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado del estudiante",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: number) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar esta inscripción? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/enrollments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: enrollmentId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Inscripción eliminada correctamente",
        });
        loadEnrollments(currentPage, searchTerm, statusFilter);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar la inscripción",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la inscripción",
        variant: "destructive",
      });
    }
  };

  const getClassTypeIcon = (type: string) => {
    return type === "DANCE" ? (
      <GraduationCap className="w-4 h-4" />
    ) : (
      <Users className="w-4 h-4" />
    );
  };

  const getClassTypeBadge = (type: string) => {
    return type === "DANCE" ? (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
        Baile
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        Deportes
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="w-full px-2 py-2 sm:px-6 sm:py-6 mx-auto">
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 w-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm font-medium">
                      Total Estudiantes
                    </p>
                    <p className="text-white text-lg sm:text-2xl font-bold">
                      {pagination.total}
                    </p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 border-green-400 w-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs sm:text-sm font-medium">
                      Activos
                    </p>
                    <p className="text-white text-lg sm:text-2xl font-bold">
                      {stats.activeStudents}
                    </p>
                  </div>
                  <Power className="h-6 w-6 sm:h-8 sm:w-8 text-green-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 border-red-400 w-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-xs sm:text-sm font-medium">
                      Inactivos
                    </p>
                    <p className="text-white text-lg sm:text-2xl font-bold">
                      {stats.inactiveStudents}
                    </p>
                  </div>
                  <PowerOff className="h-6 w-6 sm:h-8 sm:w-8 text-red-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 border-purple-400 w-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs sm:text-sm font-medium">
                      Con Deudas
                    </p>
                    <p className="text-white text-lg sm:text-2xl font-bold">
                      {stats.studentsWithDebt}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-100" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="bg-gray-800/90 border-gray-600 w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Buscar y Filtrar Estudiantes
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nombre, documento, teléfono o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white py-2">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
                <Button
                  onClick={() => window.open("/enrollment", "_blank")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nueva Inscripción
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card className="bg-gray-800/90 border-gray-600 w-full">
            <CardHeader>
              <CardTitle className="text-white">
                Lista de Estudiantes ({pagination.total} total)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-gray-300">
                        Estudiante
                      </TableHead>
                      <TableHead className="text-gray-300">Clase</TableHead>
                      <TableHead className="text-gray-300">
                        Profesor/Ubicación
                      </TableHead>
                      <TableHead className="text-gray-300">Contacto</TableHead>
                      <TableHead className="text-gray-300">Estado</TableHead>
                      <TableHead className="text-gray-300">
                        Inscripción
                      </TableHead>
                      <TableHead className="text-gray-300">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Extracted logic for table rows */}
                    {(() => {
                      if (loading) {
                        return (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-gray-400 py-8"
                            >
                              Cargando estudiantes...
                            </TableCell>
                          </TableRow>
                        );
                      } else if (enrollments.length === 0) {
                        return (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-gray-400 py-8"
                            >
                              No se encontraron estudiantes
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        return enrollments.map((enrollment) => (
                          <TableRow
                            key={enrollment.id}
                            className="border-gray-600"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                  {enrollment.student?.avatar ? (
                                    <img
                                      src={enrollment.student.avatar}
                                      alt={`Foto de ${enrollment.student.name}`}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                      {enrollment.student.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .substring(0, 2)}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Información del estudiante */}
                                <div className="space-y-1 flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">
                                    {enrollment.student.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <IdCard className="w-3 h-3" />
                                    ID: {enrollment.student.id}
                                  </div>
                                  {enrollment.student.hasDebt && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      Con deuda
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getClassTypeIcon(enrollment.danceClass.type)}
                                  <span className="text-white text-sm">
                                    {enrollment.danceClass.name}
                                  </span>
                                </div>
                                {getClassTypeBadge(enrollment.danceClass.type)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <p className="text-white">
                                  {enrollment.danceClass.trainer.name}
                                </p>
                                {enrollment.danceClass.location && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <MapPin className="w-3 h-3" />
                                    {enrollment.danceClass.location.name}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1 text-gray-300">
                                  <Phone className="w-3 h-3" />
                                  {enrollment.student.phone}
                                </div>
                                {enrollment.student.user?.email && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Mail className="w-3 h-3" />
                                    {enrollment.student.user.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <Badge
                                  variant={
                                    enrollment.student.isActive ? "default" : "secondary"
                                  }
                                  className={
                                    enrollment.student.isActive
                                      ? "bg-green-600"
                                      : "bg-gray-600"
                                  }
                                >
                                  {enrollment.student.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                                {enrollment.student.hasDebt && (
                                  <div className="flex items-center gap-1 text-orange-400 text-xs">
                                    <AlertTriangle className="w-3 h-3" />
                                    Con deuda
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(
                                    enrollment.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedStudent(enrollment);
                                    setDetailModalOpen(true);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                  title="Ver detalles"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedStudent(enrollment);
                                    setEditModalOpen(true);
                                  }}
                                  className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
                                  title="Editar estudiante"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(enrollment)}
                                  className={
                                    enrollment.student.isActive
                                      ? "text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                      : "text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                  }
                                  title={
                                    enrollment.student.isActive ? "Desactivar" : "Activar"
                                  }
                                >
                                  {enrollment.student.isActive ? (
                                    <PowerOff className="w-4 h-4" />
                                  ) : (
                                    <Power className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteEnrollment(enrollment.id)
                                  }
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                  title="Eliminar inscripción"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ));
                      }
                    })()}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <AdvancedPagination
                pagination={{
                  page: pagination.page,
                  limit: pagination.limit,
                  totalCount: pagination.total,
                  totalPages: pagination.totalPages,
                  hasNext: pagination.page < pagination.totalPages,
                  hasPrev: pagination.page > 1
                }}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                itemName="estudiantes"
              />
            </CardContent>
          </Card>

          {/* Student Detail Modal */}
          {selectedStudent && (
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
              <DialogContent className="!w-[95vw] !max-w-5xl bg-gray-900 border-gray-700 h-[90vh] max-h-[90vh] overflow-y-auto !left-[50%] !translate-x-[-50%]">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-white text-xl">
                    Detalles Completos del Estudiante
                  </DialogTitle>
                </DialogHeader>
                <StudentDetailModal enrollment={selectedStudent} />
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => setDetailModalOpen(false)}
                    variant="outline"
                  >
                    Cerrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Student Modal */}
          {selectedStudent && (
            <EditStudentModal
              isOpen={editModalOpen}
              onClose={() => setEditModalOpen(false)}
              student={convertStudentForModal(selectedStudent.student)}
              onStudentUpdated={() => {
                // Recargar los datos para actualizar contadores y lista
                loadEnrollments(currentPage, searchTerm, statusFilter);
                // También actualizar el estado local del estudiante seleccionado
                setSelectedStudent(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
