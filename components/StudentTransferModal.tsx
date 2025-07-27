'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  ArrowRight, 
  GraduationCap,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Student {
  id: number;
  name: string;
  phone: string;
  user?: {
    email: string;
  };
}

interface DanceClass {
  id: number;
  name: string;
  level?: string;
  sport: "DANCE" | "VOLLEYBALL";
  capacity: number;
  description?: string;
  trainer: {
    id: number;
    name: string;
  };
  location?: {
    name: string;
    address?: string;
  };
  _count: {
    enrollments: number;
  };
}

interface StudentTransferModalProps {
  student: Student;
  currentClass: DanceClass;
  onTransferComplete: () => void;
  trigger?: React.ReactNode;
}

export function StudentTransferModal({ 
  student, 
  currentClass, 
  onTransferComplete,
  trigger 
}: StudentTransferModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<DanceClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const { toast } = useToast();

  // Cargar clases disponibles cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadAvailableClasses();
    }
  }, [isOpen]);

  const loadAvailableClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch(`/api/classes?active=true&sport=${currentClass.sport || 'DANCE'}`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar la clase actual y clases sin capacidad
        const filteredClasses = data.classes.filter((cls: any) => 
          cls.id !== currentClass.id && 
          cls._count.enrollments < cls.capacity
        );
        setAvailableClasses(filteredClasses);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases disponibles",
        variant: "destructive"
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedClassId) {
      toast({
        title: "Error",
        description: "Debes seleccionar una clase destino",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/enrollments/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id.toString(),
          fromClassId: currentClass.id,
          toClassId: parseInt(selectedClassId),
          reason: reason.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Transferencia exitosa",
          description: `${student.name} ha sido transferido exitosamente`,
        });
        setIsOpen(false);
        onTransferComplete();
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo realizar la transferencia",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error transferring student:', error);
      toast({
        title: "❌ Error",
        description: "Error al realizar la transferencia",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = availableClasses.find((cls: any) => cls.id === parseInt(selectedClassId));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-blue-500 text-blue-400 hover:bg-blue-950">
            <ArrowRight className="h-4 w-4 mr-2" />
            Transferir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-white">
            <ArrowRight className="h-5 w-5 text-blue-400" />
            Transferir Estudiante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del estudiante */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Estudiante a transferir</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-medium text-white">{student.name}</p>
                <p className="text-sm text-gray-400">ID: {student.id}</p>
                {student.user?.email && (
                  <p className="text-sm text-gray-400">{student.user.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Clase actual */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Clase actual</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-400" />
                <span className="text-white font-medium">{currentClass.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300 text-sm">Profesor: {currentClass.trainer.name}</span>
              </div>
              {currentClass.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">{currentClass.location.name}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                {currentClass.level}
              </Badge>
            </div>
          </div>

          {/* Selección de clase destino */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              Clase destino
            </label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Seleccionar clase destino" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {loadingClasses ? (
                  <div className="p-2 text-gray-400 text-sm">Cargando clases...</div>
                ) : availableClasses.length === 0 ? (
                  <div className="p-2 text-gray-400 text-sm">No hay clases disponibles</div>
                ) : (
                  availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-white hover:bg-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium">{cls.name}</span>
                        <span className="text-xs text-gray-400">
                          {cls.trainer.name} • {cls._count.enrollments}/{cls.capacity} estudiantes
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Información de la clase seleccionada */}
          {selectedClass && (
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600">
              <h3 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Clase seleccionada
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-400" />
                  <span className="text-white font-medium">{selectedClass.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">Profesor: {selectedClass.trainer.name}</span>
                </div>
                {selectedClass.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{selectedClass.location.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">
                    {selectedClass._count.enrollments}/{selectedClass.capacity} estudiantes
                  </span>
                </div>
                <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                  {selectedClass.level}
                </Badge>
              </div>
            </div>
          )}

          {/* Motivo de la transferencia */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              Motivo de la transferencia (opcional)
            </label>
            <Textarea
              placeholder="Ej: Mejora de nivel, cambio de horario, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          {/* Advertencia */}
          <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-300">Confirmación requerida</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  Esta acción transferirá al estudiante inmediatamente al nuevo grupo. 
                  El cambio será permanente y se registrará en el historial.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={!selectedClassId || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {loading ? 'Transferiendo...' : 'Confirmar Transferencia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 