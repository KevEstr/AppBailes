import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Trash2 } from "lucide-react";
import { Student, DanceClass } from "@/types/class-management";

interface EnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: DanceClass | null;
  viewingEnrolled: boolean;
  availableStudents: Student[];
  enrolledStudents: { student: Student }[];
  studentSearchQuery: string;
  onStudentSearchChange: (query: string) => void;
  onEnrollStudent: (studentId: number, classId: number) => void;
  onRemoveEnrollment: (enrollmentId: number, classId: number, studentName: string, className: string) => void;
}

export function EnrollmentModal({
  open,
  onOpenChange,
  selectedClass,
  viewingEnrolled,
  availableStudents,
  enrolledStudents,
  studentSearchQuery,
  onStudentSearchChange,
  onEnrollStudent,
  onRemoveEnrollment,
}: EnrollmentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-800 border border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {viewingEnrolled
              ? "Estudiantes inscritos en"
              : "Inscribir Estudiante en"}{" "}
            {selectedClass?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {viewingEnrolled ? (
            enrolledStudents.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No hay estudiantes inscritos en esta clase.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {enrolledStudents.map(({ student }) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{student.name}</p>
                        <p className="text-sm text-gray-400">ID: {student.id}</p>
                        <p className="text-sm text-gray-400">{student.user?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onRemoveEnrollment(
                          selectedClass?.enrollments.find(
                            (e) => e.student.id === student.id
                          )?.id!,
                          selectedClass!.id,
                          student.name,
                          selectedClass!.name
                        )
                      }
                      className="border-red-500 text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : availableStudents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              {studentSearchQuery.trim() 
                ? `No se encontraron estudiantes que coincidan con "${studentSearchQuery}"`
                : "No hay estudiantes disponibles para inscribir en esta clase."
              }
            </p>
          ) : (
            <>
              <p className="text-gray-300">
                Selecciona un estudiante para inscribir en esta clase:
              </p>
              
              {/* Barra de búsqueda para estudiantes */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, ID, email o teléfono..."
                  value={studentSearchQuery}
                  onChange={(e) => onStudentSearchChange(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white pl-10 pr-10 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                {studentSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onStudentSearchChange("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="max-h-80 overflow-y-auto space-y-2">
                {/* Contador de resultados */}
                {studentSearchQuery.trim() && (
                  <div className="text-sm text-gray-400 mb-2">
                    {availableStudents.length} estudiante{availableStudents.length !== 1 ? 's' : ''} encontrado{availableStudents.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {availableStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{student.name}</p>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          <p>📱 {student.phone}</p>
                          <p>🆔 ID: {student.id}</p>
                          {student.user?.email && <p>📧 {student.user.email}</p>}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        selectedClass &&
                        onEnrollStudent(student.id, selectedClass.id)
                      }
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Inscribir
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 