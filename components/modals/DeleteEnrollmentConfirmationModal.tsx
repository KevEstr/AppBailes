import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface DeleteEnrollmentConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentToDelete: {
    enrollmentId: number;
    classId: number;
    studentName: string;
    className: string;
  } | null;
  onConfirm: () => void;
}

export function DeleteEnrollmentConfirmationModal({
  open,
  onOpenChange,
  enrollmentToDelete,
  onConfirm,
}: DeleteEnrollmentConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-orange-400" />
            Confirmar Retiro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-300">
            ¿Estás seguro de que deseas retirar a{" "}
            <span className="font-semibold text-white">
              "{enrollmentToDelete?.studentName}"
            </span>{" "}
            de la clase{" "}
            <span className="font-semibold text-white">
              "{enrollmentToDelete?.className}"
            </span>
            ?
          </p>
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
            <p className="text-orange-300 text-sm">
              <strong>ℹ️ Información:</strong> El estudiante podrá volver a inscribirse 
              en esta clase en el futuro si lo desea.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Retirar Estudiante
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 