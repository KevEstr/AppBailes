'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  ArrowRight, 
  Calendar,
  User,
  GraduationCap,
  Clock
} from 'lucide-react';

interface Transfer {
  id: number;
  studentId: string;
  fromClassId: number;
  toClassId: number;
  reason?: string;
  transferredAt: string;
  fromClass: {
    id: number;
    name: string;
    level: string;
    trainer: {
      id: number;
      name: string;
    };
  };
  toClass: {
    id: number;
    name: string;
    level: string;
    trainer: {
      id: number;
      name: string;
    };
  };
  user: {
    id: number;
    email: string;
  };
}

interface StudentTransferHistoryProps {
  studentId: string;
  studentName: string;
  trigger?: React.ReactNode;
}

export function StudentTransferHistory({ 
  studentId, 
  studentName,
  trigger 
}: StudentTransferHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar historial cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadTransferHistory();
    }
  }, [isOpen, studentId]);

  const loadTransferHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/enrollments/transfer?studentId=${studentId}`);
      const data = await response.json();
      
      if (data.success) {
        setTransfers(data.transfers);
      }
    } catch (error) {
      console.error('Error loading transfer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelBadge = (level: string) => {
    const levelColors = {
      'BEGINNER': 'bg-green-500',
      'INTERMEDIATE': 'bg-yellow-500',
      'ADVANCED': 'bg-red-500'
    };
    
    return (
      <Badge className={`text-xs ${levelColors[level as keyof typeof levelColors] || 'bg-gray-500'}`}>
        {level}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-gray-500 text-gray-400 hover:bg-gray-700">
            <History className="h-4 w-4 mr-2" />
            Historial
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-blue-400" />
            Historial de Transferencias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del estudiante */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Estudiante</h3>
            <p className="text-white font-medium">{studentName}</p>
            <p className="text-sm text-gray-400">ID: {studentId}</p>
          </div>

          {/* Lista de transferencias */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Transferencias realizadas ({transfers.length})
            </h3>
            
            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-400">Cargando historial...</div>
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>No hay transferencias registradas</p>
                  <p className="text-sm">Este estudiante no ha sido transferido entre grupos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="bg-gray-800 p-4 rounded-lg border border-gray-600"
                    >
                      {/* Fecha y usuario */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(transfer.transferredAt)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Por: {transfer.user.email}
                        </div>
                      </div>

                      {/* Transferencia */}
                      <div className="flex items-center justify-between">
                        {/* Clase origen */}
                        <div className="flex-1 bg-red-900/20 p-3 rounded-lg border border-red-600">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="h-4 w-4 text-red-400" />
                            <span className="text-white font-medium text-sm">Desde</span>
                          </div>
                          <p className="text-white text-sm font-medium">{transfer.fromClass.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-300 text-xs">{transfer.fromClass.trainer.name}</span>
                          </div>
                          <div className="mt-1">
                            {getLevelBadge(transfer.fromClass.level)}
                          </div>
                        </div>

                        {/* Flecha */}
                        <div className="mx-4">
                          <ArrowRight className="h-6 w-6 text-blue-400" />
                        </div>

                        {/* Clase destino */}
                        <div className="flex-1 bg-green-900/20 p-3 rounded-lg border border-green-600">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="h-4 w-4 text-green-400" />
                            <span className="text-white font-medium text-sm">Hacia</span>
                          </div>
                          <p className="text-white text-sm font-medium">{transfer.toClass.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-300 text-xs">{transfer.toClass.trainer.name}</span>
                          </div>
                          <div className="mt-1">
                            {getLevelBadge(transfer.toClass.level)}
                          </div>
                        </div>
                      </div>

                      {/* Motivo */}
                      {transfer.reason && (
                        <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                          <p className="text-sm text-gray-300">
                            <span className="font-medium">Motivo:</span> {transfer.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Botón cerrar */}
          <div className="flex justify-end pt-4 border-t border-gray-600">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 