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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Eye,
  Edit,
  Power,
  PowerOff,
  Trash2,
  Users,
  Calendar,
  Phone,
  Mail,
  IdCard,
  AlertTriangle,
  UserPlus,
  Download,
} from "lucide-react";
import { StudentDetailModal } from "@/components/student-detail-modal";
import EditStudentModal from "@/components/edit-student-modal";
import { AdvancedPagination } from "./ui/advanced-pagination";
import { formatPhoneForDisplay } from "@/lib/phone-utils";

// Utility function to truncate text
const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

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
  paymentCutoffDay?: number;
  monthlyFee?: number;
  student: Student;
  danceClass: {
    id: number;
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
}

interface StudentWithClasses {
  student: Student;
  classEnrollments: ClassEnrollment[];
  totalClasses: number;
  activeClasses: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function StudentsManagement() {
  const [students, setStudents] = useState<StudentWithClasses[]>([]);
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
    useState<StudentWithClasses | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast } = useToast();

  // Función helper para convertir StudentWithClasses a Student del modal
  const convertStudentForModal = (studentWithClasses: StudentWithClasses) => ({
    id: studentWithClasses.student.id.toString(),
    name: studentWithClasses.student.name,
    email: studentWithClasses.student.user?.email || '',
    phone: studentWithClasses.student.phone,
    documentNumber: studentWithClasses.student.id.toString(),
    documentType: 'CC', // Valor por defecto
    birthDate: '',
    address: '',
    addressLatitude: undefined,
    addressLongitude: undefined,
    neighborhood: '',
    city: "Itagüí",
    hasSisben: false,
    eps: '',
    bloodType: '',
    hasRestrictions: false,
    restrictionsDescription: '',
    medicalConditions: '',
    isAdult: true,
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    monthlyFee: 0,
    avatar: studentWithClasses.student.avatar || '',
    isActive: studentWithClasses.student.isActive,
    classEnrollments: studentWithClasses.classEnrollments, // Incluir las clases
    // Campos legacy para compatibilidad
    age: undefined,
    maritalStatus: '',
    emergencyContact: '',
    emergencyPhone: '',
    relationship: '',
    hasMedicalRestrictions: false,
    medicalRestrictions: ''
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
        groupByStudent: "true", // Nueva opción para agrupar por estudiante
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/api/enrollments?${params}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students || data.enrollments); // Compatibilidad con ambos formatos
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

  const handleToggleStatus = async (studentWithClasses: StudentWithClasses) => {
    try {
      // Actualizar el estado del estudiante
      const response = await fetch("/api/students/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentWithClasses.student.id.toString(),
          name: studentWithClasses.student.name,
          phone: studentWithClasses.student.phone,
          email: studentWithClasses.student.user?.email || '',
          isActive: !studentWithClasses.student.isActive
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Estudiante ${
            !studentWithClasses.student.isActive ? "activado" : "desactivado"
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


  const getClassTypeBadge = (sport: string) => {
    console.log('Sport type:', sport) 
    return sport === "DANCE" ? (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
        Baile
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        Deporte
      </Badge>
    );
  };

  const handleExportStudentsExcel = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch('/api/students/export-excel', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar estudiantes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'estudiantes.xlsx';
      if (contentDisposition) {
        const filenameRegex = /filename="(.+)"/;
        const filenameMatch = filenameRegex.exec(contentDisposition);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Archivo descargado",
        description: `Archivo ${filename} descargado exitosamente`
      });
    } catch (error) {
      console.error('Error downloading students Excel file:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Error al descargar archivo Excel',
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleExportStudentsExcel}
                    disabled={isDownloading}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-400 hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-medium flex-1 sm:flex-none"
                  >
                    {isDownloading ? (
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
                    onClick={() => window.open("/enrollment", "_blank")}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-xs font-medium flex-1 sm:flex-none"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Nueva Inscripción</span>
                    <span className="sm:hidden">Nueva</span>
                  </Button>
                </div>
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
                      } else if (students.length === 0) {
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
                        return students.map((studentWithClasses) => (
                          <TableRow
                            key={studentWithClasses.student.id}
                            className="border-gray-600"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                  {studentWithClasses.student?.avatar ? (
                                    <img
                                      src={studentWithClasses.student.avatar}
                                      alt={`Foto de ${studentWithClasses.student.name}`}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                      {studentWithClasses.student.name
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
                                    {studentWithClasses.student.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <IdCard className="w-3 h-3" />
                                    ID: {studentWithClasses.student.id}
                                  </div>
                                  {studentWithClasses.student.hasDebt && (
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
                                <div className="text-sm text-white font-medium">
                                  {studentWithClasses.activeClasses} clase{studentWithClasses.activeClasses !== 1 ? 's' : ''} activa{studentWithClasses.activeClasses !== 1 ? 's' : ''}
                                </div>
                                <div className="space-y-1">
                                  {studentWithClasses.classEnrollments.slice(0, 2).map((enrollment) => (
                                    <div key={enrollment.id} className="flex items-center gap-2">
                                      {getClassTypeBadge(enrollment.danceClass.sport)}
                                    </div>
                                  ))}
                                  {studentWithClasses.classEnrollments.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{studentWithClasses.classEnrollments.length - 2} más
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="text-white">
                                  {studentWithClasses.classEnrollments.length > 0 && 
                                    truncateText(studentWithClasses.classEnrollments[0].danceClass.trainer.name)
                                  }
                                </div>
                                {studentWithClasses.classEnrollments.length > 0 && 
                                 studentWithClasses.classEnrollments[0].danceClass.location && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    {truncateText(studentWithClasses.classEnrollments[0].danceClass.location.name)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1 text-gray-300">
                                  <Phone className="w-3 h-3" />
                                  {formatPhoneForDisplay(studentWithClasses.student.phone)}
                                </div>
                                {studentWithClasses.student.user?.email && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Mail className="w-3 h-3" />
                                    {studentWithClasses.student.user.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <Badge
                                  variant={
                                    studentWithClasses.student.isActive ? "default" : "secondary"
                                  }
                                  className={
                                    studentWithClasses.student.isActive
                                      ? "bg-green-600"
                                      : "bg-gray-600"
                                  }
                                >
                                  {studentWithClasses.student.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                                {studentWithClasses.student.hasDebt && (
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
                                  {studentWithClasses.classEnrollments.length > 0 && 
                                    new Date(studentWithClasses.classEnrollments[0].createdAt).toLocaleDateString()
                                  }
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedStudent(studentWithClasses);
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
                                    setSelectedStudent(studentWithClasses);
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
                                  onClick={() => handleToggleStatus(studentWithClasses)}
                                  className={
                                    studentWithClasses.student.isActive
                                      ? "text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                      : "text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                  }
                                  title={
                                    studentWithClasses.student.isActive ? "Desactivar" : "Activar"
                                  }
                                >
                                  {studentWithClasses.student.isActive ? (
                                    <PowerOff className="w-4 h-4" />
                                  ) : (
                                    <Power className="w-4 h-4" />
                                  )}
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
                <StudentDetailModal enrollment={selectedStudent?.classEnrollments[0] || null} />
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
              student={convertStudentForModal(selectedStudent)}
              onStudentUpdated={async () => {
                // Recargar los datos para actualizar contadores y lista
                await loadEnrollments(currentPage, searchTerm, statusFilter);
                
                // También actualizar el estado local del estudiante seleccionado
                // Buscar el estudiante actualizado en la nueva lista
                const updatedStudents = students.map(studentWithClasses => {
                  if (studentWithClasses.student.id.toString() === selectedStudent.student.id.toString()) {
                    // Cargar los datos actualizados del estudiante desde el API
                    return fetch(`/api/students/profile?studentId=${studentWithClasses.student.id}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.success && data.student) {
                          return {
                            ...studentWithClasses,
                            student: {
                              ...studentWithClasses.student,
                              name: data.student.name,
                              phone: data.student.phone,
                              isActive: data.student.isActive,
                              // Incluir datos de enrollment si existen
                              ...(data.student.enrollmentData && {
                                address: data.student.enrollmentData.address,
                                neighborhood: data.student.enrollmentData.neighborhood,
                                city: data.student.enrollmentData.city,
                              })
                            },
                            classEnrollments: data.student.classEnrollments || studentWithClasses.classEnrollments
                          };
                        }
                        return studentWithClasses;
                      })
                      .catch(() => studentWithClasses);
                  }
                  return studentWithClasses;
                });
                
                // Actualizar el estado con los estudiantes actualizados
                Promise.all(updatedStudents).then(updated => {
                  setStudents(updated);
                });
                
                setSelectedStudent(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
