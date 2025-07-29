import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DanceClass } from "@/types/class-management";

interface DeleteClassConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classToDelete: DanceClass | null;
  onConfirm: () => void;
}

export function DeleteClassConfirmationModal({
  open,
  onOpenChange,
  classToDelete,
  onConfirm,
}: DeleteClassConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            Confirmar Eliminación
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-300">
            ¿Estás seguro de que deseas eliminar la clase{" "}
            <span className="font-semibold text-white">
              "{classToDelete?.name}"
            </span>
            ?
          </p>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. 
              Se eliminarán todas las inscripciones asociadas a esta clase.
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Clase
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 