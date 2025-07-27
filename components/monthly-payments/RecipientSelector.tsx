'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Users, Phone, PhoneOff, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  debtAmount?: number;
  lastPayment?: string;
}

interface RecipientStats {
  total: number;
  withPhone: number;
  withoutPhone: number;
  active: number;
  inactive: number;
}

interface RecipientSelectorProps {
  schedulerId: number;
  schedulerType: string;
  targetFilter: string;
  onRecipientsChange: (recipients: string[]) => void;
}

export function RecipientSelector({ 
  schedulerId, 
  schedulerType, 
  targetFilter, 
  onRecipientsChange 
}: RecipientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Student[]>([]);
  const [currentRecipients, setCurrentRecipients] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RecipientStats>({
    total: 0,
    withPhone: 0,
    withoutPhone: 0,
    active: 0,
    inactive: 0
  });

  // Cargar recomendaciones y destinatarios actuales
  useEffect(() => {
    if (isOpen) {
      loadRecommendations();
      loadCurrentRecipients();
    }
  }, [isOpen, schedulerType, targetFilter]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/scheduler-recommendations?schedulerType=${schedulerType}&targetFilter=${targetFilter}`
      );
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error cargando recomendaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRecipients = async () => {
    try {
      const response = await fetch(`/api/admin/scheduler-recipients/${schedulerId}`);
      const data = await response.json();
      setCurrentRecipients(data.recipients || []);
      setStats(data.stats || {
        total: 0,
        withPhone: 0,
        withoutPhone: 0,
        active: 0,
        inactive: 0
      });
      
      // Marcar como seleccionados los destinatarios actuales
      const currentIds = data.recipients?.map((r: any) => r.studentId) || [];
      setSelectedStudents(currentIds);
    } catch (error) {
      console.error('Error cargando destinatarios actuales:', error);
    }
  };

  const addRecipients = async () => {
    if (selectedStudents.length === 0) return;

    try {
      const response = await fetch(`/api/admin/scheduler-recipients/${schedulerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudents,
          addedBy: 'admin'
        })
      });

      if (response.ok) {
        await loadCurrentRecipients();
        onRecipientsChange(selectedStudents);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error agregando destinatarios:', error);
    }
  };

  const removeRecipients = async (studentIds: string[]) => {
    try {
      const response = await fetch(
        `/api/admin/scheduler-recipients/${schedulerId}?studentIds=${JSON.stringify(studentIds)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await loadCurrentRecipients();
        onRecipientsChange(currentRecipients
          .filter(r => !studentIds.includes(r.id))
          .map(r => r.id)
        );
      }
    } catch (error) {
      console.error('Error removiendo destinatarios:', error);
    }
  };

  const filteredRecommendations = recommendations.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecommendationTitle = () => {
    switch (schedulerType) {
      case 'MONTHLY_PAYMENT':
        return 'Estudiantes para recordatorio mensual';
      case 'DEBT_REMINDER':
        return 'Estudiantes con deuda pendiente';
      case 'OVERDUE_WARNING':
        return 'Estudiantes con pagos vencidos';
      case 'PARTIAL_PAYMENT':
        return 'Estudiantes con pagos parciales';
      default:
        return 'Recomendaciones de estudiantes';
    }
  };

  const getRecommendationDescription = () => {
    switch (targetFilter) {
      case 'ALL_ACTIVE':
        return 'Todos los estudiantes activos';
      case 'WITH_DEBT':
        return 'Estudiantes con deuda pendiente';
      case 'OVERDUE_PAYMENTS':
        return 'Estudiantes con pagos vencidos';
      case 'PARTIAL_PAYMENTS':
        return 'Estudiantes con pagos parciales';
      case 'SPECIFIC_STUDENTS':
        return 'Estudiantes específicos seleccionados';
      default:
        return 'Filtro personalizado';
    }
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas actuales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Destinatarios Actuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.withPhone}</div>
              <div className="text-sm text-gray-500">Con teléfono</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.withoutPhone}</div>
              <div className="text-sm text-gray-500">Sin teléfono</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.active}</div>
              <div className="text-sm text-gray-500">Activos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón para abrir selector */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Gestionar Destinatarios
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gestionar Destinatarios del Scheduler</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de recomendaciones */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{getRecommendationTitle()}</h3>
                <p className="text-sm text-gray-600 mb-4">{getRecommendationDescription()}</p>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar estudiantes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-64 border rounded-md p-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Cargando recomendaciones...</div>
                    </div>
                  ) : filteredRecommendations.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No se encontraron estudiantes
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredRecommendations.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                        >
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedStudents([...selectedStudents, student.id]);
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{student.name}</span>
                              {student.isActive ? (
                                <Badge variant="default" className="text-xs">Activo</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              {student.phone ? (
                                <>
                                  <Phone className="h-3 w-3" />
                                  <span>{student.phone}</span>
                                </>
                              ) : (
                                <>
                                  <PhoneOff className="h-3 w-3" />
                                  <span>Sin teléfono</span>
                                </>
                              )}
                            </div>
                            {student.debtAmount && (
                              <div className="text-xs text-red-600">
                                Deuda: ${student.debtAmount}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-600">
                    {selectedStudents.length} seleccionados
                  </span>
                  <Button onClick={addRecipients} disabled={selectedStudents.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Seleccionados
                  </Button>
                </div>
              </div>
            </div>

            {/* Panel de destinatarios actuales */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Destinatarios Actuales</h3>
              
              <ScrollArea className="h-64 border rounded-md p-2">
                {currentRecipients.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No hay destinatarios configurados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentRecipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-2 rounded-md bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{recipient.name}</span>
                            {recipient.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            {recipient.phone ? (
                              <>
                                <Phone className="h-3 w-3" />
                                <span>{recipient.phone}</span>
                              </>
                            ) : (
                              <>
                                <PhoneOff className="h-3 w-3" />
                                <span>Sin teléfono</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipients([recipient.id])}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {currentRecipients.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRecipients(currentRecipients.map(r => r.id))}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover Todos
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 