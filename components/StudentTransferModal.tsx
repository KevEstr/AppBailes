'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  GraduationCap,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Student {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

interface DanceClass {
  id: number;
  name: string;
  level: string;
  sport: string;
  capacity: number;
  trainer: {
    id: number;
    name: string;
  };
  _count: {
    enrollments: number;
  };
}

interface StudentTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  currentClass: DanceClass | null;
  onTransferComplete: () => void;
}

export function StudentTransferModal({
  isOpen,
  onClose,
  student,
  currentClass,
  onTransferComplete,
}: StudentTransferModalProps) {
  const { toast } = useToast();
  const [availableClasses, setAvailableClasses] = useState<DanceClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Cargar clases disponibles cuando se abre el modal
  useEffect(() => {
    if (isOpen && currentClass) {
      loadAvailableClasses();
    }
  }, [isOpen, currentClass]);

  const loadAvailableClasses = async () => {
    if (!currentClass) return;

    setLoadingClasses(true);
    try {
      const response = await fetch(
        `/api/classes?active=true&sport=${currentClass.sport}&excludeId=${currentClass.id}`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableClasses(data.classes);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las clases disponibles',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar las clases',
        variant: 'destructive',
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleTransfer = async () => {
    if (!student || !currentClass || !selectedClassId) {
      toast({
        title: 'Error',
        description: 'Faltan datos para realizar la transferencia',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/enrollments/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          fromClassId: currentClass.id,
          toClassId: parseInt(selectedClassId),
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Transferencia exitosa',
          description: `${student.name} ha sido transferido exitosamente`,
        });
        onTransferComplete();
        onClose();
        resetForm();
      } else {
        toast({
          title: '❌ Error',
          description: data.error || 'No se pudo realizar la transferencia',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error transferring student:', error);
      toast({
        title: '❌ Error',
        description: 'Error al realizar la transferencia',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedClassId('');
    setReason('');
  };

  const selectedClass = availableClasses.find(
    (cls) => cls.id.toString() === selectedClassId
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-green-500';
      case 'INTERMEDIATE':
        return 'bg-yellow-500';
      case 'ADVANCED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'Básico';
      case 'INTERMEDIATE':
        return 'Intermedio';
      case 'ADVANCED':
        return 'Avanzado';
      default:
        return level;
    }
  };

  if (!student || !currentClass) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="h-6 w-6 text-blue-500" />
            Transferir Estudiante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del estudiante */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Estudiante
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {student.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-medium text-white">{student.name}</p>
                <p className="text-sm text-gray-400">ID: {student.id}</p>
                <p className="text-sm text-gray-400">{student.phone}</p>
              </div>
            </div>
          </div>

          {/* Clase actual */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Clase Actual
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{currentClass.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getLevelColor(currentClass.level)}>
                    {getLevelText(currentClass.level)}
                  </Badge>
                  <span className="text-sm text-gray-400">
                    Prof. {currentClass.trainer.name}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Selección de nueva clase */}
          <div className="space-y-3">
            <Label htmlFor="newClass" className="text-white">
              Nueva Clase
            </Label>
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={loadingClasses}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la nueva clase" />
              </SelectTrigger>
              <SelectContent>
                {loadingClasses ? (
                  <SelectItem value="loading" disabled>
                    Cargando clases...
                  </SelectItem>
                ) : availableClasses.length === 0 ? (
                  <SelectItem value="no-classes" disabled>
                    No hay clases disponibles
                  </SelectItem>
                ) : (
                  availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cls.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getLevelColor(cls.level)}>
                            {getLevelText(cls.level)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {cls._count.enrollments}/{cls.capacity}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Información de la clase seleccionada */}
          {selectedClass && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Clase Destino
              </h3>
              <div>
                <p className="font-medium text-white">{selectedClass.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getLevelColor(selectedClass.level)}>
                    {getLevelText(selectedClass.level)}
                  </Badge>
                  <span className="text-sm text-gray-400">
                    Prof. {selectedClass.trainer.name}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  Capacidad: {selectedClass._count.enrollments}/{selectedClass.capacity}
                </div>
                {selectedClass._count.enrollments >= selectedClass.capacity && (
                  <div className="mt-2 flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Clase llena</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivo de la transferencia */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="text-white">
              Motivo de la transferencia (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Ej: Mejora de nivel, cambio de horario, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !selectedClassId || loadingClasses}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Transferiendo...' : 'Confirmar Transferencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 