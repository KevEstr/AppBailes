'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  Play, 
  Pause, 
  Plus, 
  Settings, 
  Trash2,
  Activity,
  Users
} from 'lucide-react';

interface PaymentPeriod {
  id: number;
  name: string;
  year: number;
  month: number;
  dueDate: string;
  isActive: boolean;
}

interface SchedulerExecution {
  id: number;
  status: string;
  startedAt: string;
  completedAt: string;
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  errorMessage?: string;
  executionLogs?: string;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  hasDebt?: boolean;
}

interface PaymentScheduler {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  dayOfMonth: number;
  hour: number;
  minute: number;
  schedulerType?: string;
  targetFilter?: string;
  customFilter?: string;
  lastExecuted?: string;
  nextExecution?: string;
  totalExecutions: number;
  totalSent: number;
  totalFailed: number;
  executions: SchedulerExecution[];
}

interface SystemStatus {
  isRunning: boolean;
  checkInterval: number;
  startedAt?: string;
}

export function PaymentSchedulerDashboard() {
  const [schedulers, setSchedulers] = useState<PaymentScheduler[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ isRunning: false, checkInterval: 60000 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el formulario de nuevo scheduler
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    dayOfMonth: number;
    hour: number;
    minute: number;
    schedulerType: string;
    targetFilter: string;
    customFilter: string;
  }>({
    name: '',
    description: '',
    dayOfMonth: 1,
    hour: 9,
    minute: 0,
    schedulerType: 'MONTHLY_PAYMENT',
    targetFilter: 'ALL_ACTIVE',
    customFilter: ''
  });

  const [cutoffGroup, setCutoffGroup] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payment-scheduler');
      if (!response.ok) throw new Error('Error al cargar schedulers');
      
      const data = await response.json();
      setSchedulers(data.schedulers);
      setSystemStatus(data.systemStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const startScheduler = async () => {
    try {
      const response = await fetch('/api/admin/payment-scheduler/start', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.status);
        console.log('✅ Scheduler iniciado');
      }
    } catch (err) {
      console.error('Error iniciando scheduler:', err);
    }
  };

  const stopScheduler = async () => {
    try {
      const response = await fetch('/api/admin/payment-scheduler/start', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.status);
        console.log('⏹️ Scheduler detenido');
      }
    } catch (err) {
      console.error('Error deteniendo scheduler:', err);
    }
  };

  const createScheduler = async () => {
    try {
      setCreating(true);
      
      const response = await fetch('/api/admin/payment-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, cutoffGroup })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando scheduler');
      }

      await loadData();
      setShowCreateDialog(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        dayOfMonth: 1,
        hour: 9,
        minute: 0,
        schedulerType: 'MONTHLY_PAYMENT',
        targetFilter: 'ALL_ACTIVE',
        customFilter: ''
      });
      setCutoffGroup('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCreating(false);
    }
  };

  const toggleScheduler = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/payment-scheduler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Error actualizando scheduler:', err);
    }
  };

  const deleteScheduler = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este scheduler?')) return;

    try {
      const response = await fetch(`/api/admin/payment-scheduler/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Error eliminando scheduler:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      PENDING: { label: 'Pendiente', className: 'bg-yellow-500' },
      RUNNING: { label: 'Ejecutando', className: 'bg-blue-500 animate-pulse' },
      COMPLETED: { label: 'Completado', className: 'bg-green-500' },
      FAILED: { label: 'Fallido', className: 'bg-red-500' },
      CANCELLED: { label: 'Cancelado', className: 'bg-gray-500' }
    };
    
    const config = configs[status as keyof typeof configs] || configs.PENDING;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSuccessRate = (sent: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((sent / total) * 100);
  };

  const getSuccessRateBadgeClass = (successRate: number) => {
    if (successRate >= 80) return 'bg-green-500';
    if (successRate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Cargando scheduler...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Estado del Sistema */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg md:text-xl">
            <Activity className="h-5 w-5" />
            Sistema de Ejecución de Schedulers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <div>
                <p className="text-white font-medium">
                  Ejecutado vía GitHub Actions
                </p>
                <p className="text-gray-400 text-sm">
                  Los schedulers se ejecutan automáticamente los días 1 y 16 de cada mes según su configuración
                </p>
              </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                <strong>ℹ️ Información:</strong> El sistema se ejecuta automáticamente los días 1 y 16 de cada mes 
                (cada hora en esos días) para verificar y ejecutar schedulers programados. Los schedulers se ejecutan 
                en su fecha, hora y minuto configurados. Todos los mensajes enviados se registran para generar reportes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-white">Schedulers de Pago</h2>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Scheduler
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-600 max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader className="border-b border-gray-600 pb-4">
              <DialogTitle className="text-white text-xl font-semibold">
                📅 Crear Recordatorio Automático
              </DialogTitle>
              <p className="text-gray-400 text-sm mt-2">
                Configura envíos automáticos de recordatorios
              </p>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-white font-medium text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Información Básica
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300 text-sm font-medium">Nombre del Recordatorio *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ej: Recordatorio Mensual Automático"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-gray-300 text-sm font-medium">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="ej: Envío automático cada 1ro del mes a todos los estudiantes activos"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Configuración de Tiempo */}
              <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg">
                <h3 className="text-white font-medium text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Programación Mensual
                </h3>
                
                <div className="bg-blue-600/20 p-3 rounded-lg border border-blue-600/30">
                  <p className="text-white font-medium">📅 Recordatorio Mensual Automático</p>
                  <p className="text-gray-400 text-sm">Se ejecutará automáticamente cada mes en la fecha y hora configurada</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="dayOfMonth" className="text-gray-300 text-sm font-medium">Día del mes</Label>
                    <Select
                      value={formData.dayOfMonth.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(value) }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Día {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hour" className="text-gray-300 text-sm font-medium">Hora</Label>
                    <Select
                      value={formData.hour.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, hour: parseInt(value) }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour.toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Grupo de corte (requerido)</Label>
                    <Select value={cutoffGroup} onValueChange={(v: any) => setCutoffGroup(v)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="15">Corte 15</SelectItem>
                        <SelectItem value="30">Corte 30</SelectItem>
                      </SelectContent>
                    </Select>
                    {!cutoffGroup && (
                      <p className="text-xs text-red-400 mt-1">Selecciona 15 o 30 para continuar</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="minute" className="text-gray-300 text-sm font-medium">Minuto</Label>
                    <Input
                      id="minute"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.minute}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!Number.isNaN(value) && value >= 0 && value <= 59) {
                          setFormData(prev => ({ ...prev, minute: value }));
                        } else if (e.target.value === '') {
                          setFormData(prev => ({ ...prev, minute: 0 }));
                        }
                      }}
                      placeholder="0-59"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>
              </div>



              {/* Información sobre destinatarios */}
              <div className="bg-green-600/20 p-4 rounded-lg border border-green-600/30">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Destinatarios
                </h3>
                <div className="mt-2 space-y-2">
                  <p className="text-green-300 text-sm">
                    ✅ Se enviará automáticamente a <strong>todos los estudiantes activos</strong>
                  </p>
                  <p className="text-gray-400 text-xs">
                    El sistema detectará automáticamente el período de pago activo y enviará el recordatorio usando las plantillas de WhatsApp existentes
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-600">
                <Button 
                  onClick={() => setShowCreateDialog(false)}
                  variant="outline"
                  className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createScheduler}
                  disabled={creating || !formData.name.trim() || !cutoffGroup}
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Creando...
                    </div>
                  ) : (
                    'Crear Recordatorio Automático'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Schedulers */}
      <div className="grid gap-4">
        {schedulers.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 md:p-8 text-center">
              <Clock className="h-8 w-8 md:h-12 md:w-12 mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 text-sm md:text-base">No hay schedulers configurados</p>
              <p className="text-xs md:text-sm text-gray-500 mt-2">
                Crea tu primer scheduler para automatizar el envío de enlaces de pago
              </p>
            </CardContent>
          </Card>
        ) : (
          schedulers.map(scheduler => (
            <Card key={scheduler.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg md:text-xl">{scheduler.name}</CardTitle>
                    {scheduler.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{scheduler.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${scheduler.isActive ? 'bg-green-500' : 'bg-gray-500'} text-xs`}>
                      {scheduler.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">
                      Mensual
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
                  <div className="bg-gray-700/30 p-3 rounded">
                    <p className="text-xs md:text-sm text-gray-400 mb-1">Programación</p>
                    <p className="text-white text-sm md:text-base font-medium">
                      Día {scheduler.dayOfMonth} cada mes
                    </p>
                    <p className="text-gray-300 text-xs md:text-sm">
                      a las {scheduler.hour.toString().padStart(2, '0')}:{scheduler.minute.toString().padStart(2, '0')}
                    </p>
                  </div>
                  
                  <div className="bg-gray-700/30 p-3 rounded">
                    <p className="text-xs md:text-sm text-gray-400 mb-1">Próxima ejecución</p>
                    <p className="text-white text-sm md:text-base font-medium break-words">
                      {scheduler.nextExecution 
                        ? new Date(scheduler.nextExecution).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                  
                  <div className="bg-gray-700/30 p-3 rounded sm:col-span-2 lg:col-span-1">
                    <p className="text-xs md:text-sm text-gray-400 mb-1">Última ejecución</p>
                    <p className="text-white text-sm md:text-base font-medium break-words">
                      {scheduler.lastExecuted 
                        ? new Date(scheduler.lastExecuted).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Nunca'
                      }
                    </p>
                  </div>
                </div>

                {/* Estadísticas Mejoradas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                  <div className="text-center bg-gray-700/20 p-3 rounded">
                    <p className="text-lg md:text-2xl font-bold text-white">{scheduler.totalExecutions}</p>
                    <p className="text-xs md:text-sm text-gray-400">Ejecuciones</p>
                  </div>
                  <div className="text-center bg-gray-700/20 p-3 rounded">
                    <p className="text-lg md:text-2xl font-bold text-green-400">{scheduler.totalSent}</p>
                    <p className="text-xs md:text-sm text-gray-400">Enviados</p>
                  </div>
                  <div className="text-center bg-gray-700/20 p-3 rounded">
                    <p className="text-lg md:text-2xl font-bold text-red-400">{scheduler.totalFailed}</p>
                    <p className="text-xs md:text-sm text-gray-400">Fallidos</p>
                    {scheduler.totalFailed > 0 && (
                      <p className="text-xs text-red-300 mt-1">
                        {scheduler.totalFailed} mensajes no entregados
                      </p>
                    )}
                  </div>
                  <div className="text-center bg-gray-700/20 p-3 rounded">
                    <p className="text-lg md:text-2xl font-bold text-blue-400">
                      {getSuccessRate(scheduler.totalSent, scheduler.totalSent + scheduler.totalFailed)}%
                    </p>
                    <p className="text-xs md:text-sm text-gray-400">Tasa de Éxito</p>
                  </div>
                </div>

                {/* Últimas ejecuciones mejoradas */}
                {scheduler.executions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs md:text-sm text-gray-400 mb-2">Últimas ejecuciones</p>
                    <div className="space-y-2">
                      {scheduler.executions.slice(0, 3).map(execution => {
                        const successRate = getSuccessRate(execution.sentMessages, execution.totalMessages);
                        
                        return (
                          <div key={execution.id} className="bg-gray-700 rounded p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusBadge(execution.status)}
                                <span className="text-xs md:text-sm text-gray-300">
                                  {new Date(execution.startedAt).toLocaleString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs md:text-sm">
                                <span className="text-gray-300">
                                  {execution.sentMessages}/{execution.totalMessages} enviados
                                </span>
                                <Badge className={getSuccessRateBadgeClass(successRate)}>
                                  {successRate}% éxito
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Información básica de la ejecución */}
                            <div className="text-xs text-gray-400 space-y-1">
                              <p>📊 Tasa de éxito: {successRate}%</p>
                              {execution.errorMessage && (
                                <p>❌ Error: {execution.errorMessage}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => toggleScheduler(scheduler.id, !scheduler.isActive)}
                    variant={scheduler.isActive ? "destructive" : "default"}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {scheduler.isActive ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Activar
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => deleteScheduler(scheduler.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-600/10 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
