'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock,
  Calendar,
  PlayCircle,
  PauseCircle,
  XCircle,
  CheckCircle,
  Plus,
  Timer,
  Users,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface ScheduledWhatsAppManagerProps {
  periodId: number;
  periodName: string;
}

interface ScheduledSend {
  id: number;
  name: string;
  scheduledDate: Date;
  intervalMinutes: number;
  status: string;
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  period: {
    name: string;
  };
}

export function ScheduledWhatsAppManager({ periodId, periodName }: ScheduledWhatsAppManagerProps) {
  const [scheduledSends, setScheduledSends] = useState<ScheduledSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    name: '',
    scheduledDate: '',
    scheduledTime: '',
    intervalMinutes: 5
  });

  useEffect(() => {
    loadScheduledSends();
  }, [periodId]);

  const loadScheduledSends = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/scheduled-whatsapp?periodId=${periodId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar envíos programados');
      }
      
      const data = await response.json();
      setScheduledSends(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScheduledSend = async () => {
    if (!formData.name || !formData.scheduledDate || !formData.scheduledTime) {
      alert('Completa todos los campos obligatorios');
      return;
    }

    try {
      setCreating(true);
      
      // Combinar fecha y hora
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const response = await fetch('/api/admin/scheduled-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId,
          name: formData.name,
          scheduledDate: scheduledDateTime.toISOString(),
          intervalMinutes: formData.intervalMinutes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear envío programado');
      }

      // Limpiar formulario y recargar lista
      setFormData({
        name: '',
        scheduledDate: '',
        scheduledTime: '',
        intervalMinutes: 5
      });
      setShowCreateDialog(false);
      await loadScheduledSends();

    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelScheduledSend = async (id: number) => {
    if (!confirm('¿Estás seguro de cancelar este envío programado?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scheduled-whatsapp/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al cancelar envío');
      }

      await loadScheduledSends();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { 
        label: 'Pendiente', 
        icon: Clock, 
        className: 'bg-yellow-900/50 text-yellow-300 border-yellow-600' 
      },
      RUNNING: { 
        label: 'Ejecutándose', 
        icon: PlayCircle, 
        className: 'bg-blue-900/50 text-blue-300 border-blue-600' 
      },
      COMPLETED: { 
        label: 'Completado', 
        icon: CheckCircle, 
        className: 'bg-green-900/50 text-green-300 border-green-600' 
      },
      FAILED: { 
        label: 'Fallido', 
        icon: XCircle, 
        className: 'bg-red-900/50 text-red-300 border-red-600' 
      },
      CANCELLED: { 
        label: 'Cancelado', 
        icon: PauseCircle, 
        className: 'bg-gray-900/50 text-gray-300 border-gray-600' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (sent: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((sent / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-white">Envíos Programados de WhatsApp</h3>
          <p className="text-gray-400">
            Programa envíos automáticos de enlaces de pago para {periodName}
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Programar Envío
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-gray-800 border-gray-600 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Programar Envío de WhatsApp</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Nombre del envío</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Recordatorio Mayo 2025"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Fecha</Label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Hora</Label>
                  <Input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Intervalo entre mensajes (minutos)</Label>
                <Select 
                  value={formData.intervalMinutes.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, intervalMinutes: parseInt(value) })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="1" className="text-white hover:bg-gray-600">1 minuto</SelectItem>
                    <SelectItem value="2" className="text-white hover:bg-gray-600">2 minutos</SelectItem>
                    <SelectItem value="5" className="text-white hover:bg-gray-600">5 minutos</SelectItem>
                    <SelectItem value="10" className="text-white hover:bg-gray-600">10 minutos</SelectItem>
                    <SelectItem value="15" className="text-white hover:bg-gray-600">15 minutos</SelectItem>
                    <SelectItem value="30" className="text-white hover:bg-gray-600">30 minutos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-400 mt-1">
                  Tiempo de espera entre cada mensaje para evitar spam
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateScheduledSend}
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {creating ? 'Creando...' : 'Programar Envío'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de envíos programados */}
      {scheduledSends.length === 0 ? (
        <Card className="bg-gray-800/90 border-gray-600">
          <CardContent className="text-center py-8">
            <Timer className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">No hay envíos programados</h3>
            <p className="text-gray-400 mb-4">
              Programa envíos automáticos para notificar a los acudientes sobre los enlaces de pago.
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear primer envío programado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scheduledSends.map((scheduled) => (
            <Card key={scheduled.id} className="bg-gray-800/90 border-gray-600">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-white">{scheduled.name}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(scheduled.scheduledDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        {scheduled.intervalMinutes} min intervalo
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(scheduled.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Estadísticas */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-300">
                        Total: {scheduled.totalMessages} mensajes
                      </span>
                    </div>
                    
                    {scheduled.status === 'RUNNING' || scheduled.status === 'COMPLETED' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-gray-300">
                            Enviados: {scheduled.sentMessages}
                          </span>
                        </div>
                        
                        {scheduled.failedMessages > 0 && (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-sm text-gray-300">
                              Fallidos: {scheduled.failedMessages}
                            </span>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>

                  {/* Progreso */}
                  {(scheduled.status === 'RUNNING' || scheduled.status === 'COMPLETED') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Progreso</span>
                        <span className="text-white">
                          {getProgressPercentage(scheduled.sentMessages, scheduled.totalMessages)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${getProgressPercentage(scheduled.sentMessages, scheduled.totalMessages)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex justify-end items-center gap-2">
                    {scheduled.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-600 bg-red-900/20 hover:bg-red-800/30"
                        onClick={() => handleCancelScheduledSend(scheduled.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                    
                    {scheduled.status === 'FAILED' && (
                      <div className="flex items-center gap-1 text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Error en envío</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                {(scheduled.startedAt || scheduled.completedAt) && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                      {scheduled.startedAt && (
                        <div>
                          <span className="font-medium">Iniciado:</span> {formatDate(scheduled.startedAt)}
                        </div>
                      )}
                      {scheduled.completedAt && (
                        <div>
                          <span className="font-medium">Completado:</span> {formatDate(scheduled.completedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 