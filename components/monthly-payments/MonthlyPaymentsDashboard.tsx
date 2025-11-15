'use client';

import { useState, useEffect, useRef } from 'react';
import { PaymentDashboard, PaymentDashboardRef } from '@/components/monthly-payments/PaymentDashboard';
import { PendingPaymentsDashboard, PendingPaymentsDashboardRef } from '@/components/monthly-payments/PendingPaymentsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Settings, Calendar, DollarSign, FileText, Users, CheckCircle, Clock, ChevronsUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface PaymentPeriod {
  id: number;
  year: number;
  month: number;
  name: string;
  dueDate: Date;
  isActive: boolean;
}

interface MonthlyFeeConfig {
  id: number;
  amount: number;
  description?: string;
  isActive: boolean;
  validFrom: Date;
}

export function MonthlyPaymentsDashboard() {
  const [periods, setPeriods] = useState<PaymentPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [danceFee, setDanceFee] = useState<MonthlyFeeConfig | null>(null);
  const [volleyballFee, setVolleyballFee] = useState<MonthlyFeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPayments, setGeneratingPayments] = useState(false);
  const [pendingStats, setPendingStats] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    message: string;
    created: number;
    updated: number;
  } | null>(null);

  // Referencias para actualizar los componentes hijos
  const pendingPaymentsRef = useRef<PendingPaymentsDashboardRef>(null);
  const paymentDashboardRef = useRef<PaymentDashboardRef>(null);

  // Formulario de nueva mensualidad
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDescription, setNewFeeDescription] = useState('');
  const [newFeeSport, setNewFeeSport] = useState<'DANCE' | 'VOLLEYBALL' | ''>('');
  const [updatingFee, setUpdatingFee] = useState(false);

  // Formulario de nuevo período
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear().toString());
  const [newPeriodMonth, setNewPeriodMonth] = useState((new Date().getMonth() + 1).toString());
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [showCreatePeriodDialog, setShowCreatePeriodDialog] = useState(false);
  const [showPeriodSuccessModal, setShowPeriodSuccessModal] = useState(false);
  const [createdPeriodName, setCreatedPeriodName] = useState('');
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPeriods(),
        loadCurrentFee()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingStats = async (periodId: number) => {
    try {
      const response = await fetch(`/api/admin/monthly-payments/pending-stats?periodId=${periodId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingStats(data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas de pagos pendientes:', err);
    }
  };

  const loadPeriods = async () => {
    const response = await fetch('/api/admin/payment-periods');
    if (!response.ok) throw new Error('Error al cargar períodos');
    
    const data = await response.json();
    setPeriods(data);
    
    // Seleccionar el período más reciente por defecto
    if (data.length > 0 && !selectedPeriod) {
      setSelectedPeriod(data[0].id);
      loadPendingStats(data[0].id);
    }
  };

  const loadCurrentFee = async () => {
    const response = await fetch('/api/admin/monthly-fee');
    if (response.ok) {
      const data = await response.json();
      setDanceFee(data?.dance || null);
      setVolleyballFee(data?.volleyball || null);
    }
  };

  const updateMonthlyFee = async () => {
    if (!newFeeAmount || !newFeeSport) return;

    try {
      setUpdatingFee(true);
      const response = await fetch('/api/admin/monthly-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newFeeAmount),
          description: newFeeDescription || undefined,
          sport: newFeeSport
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await loadCurrentFee();
      setNewFeeAmount('');
      setNewFeeDescription('');
      setNewFeeSport('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar mensualidad');
    } finally {
      setUpdatingFee(false);
    }
  };

  const createPeriod = async () => {
    if (!newPeriodYear || !newPeriodMonth) return;

    try {
      setCreatingPeriod(true);
      const response = await fetch('/api/admin/payment-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(newPeriodYear),
          month: parseInt(newPeriodMonth)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const createdPeriod = await response.json();
      
      // Cerrar el modal de creación
      setShowCreatePeriodDialog(false);
      
      // Mostrar modal de éxito
      setCreatedPeriodName(createdPeriod.name);
      setShowPeriodSuccessModal(true);
      
      // Recargar períodos
      await loadPeriods();
      
      // Resetear formulario
      setNewPeriodYear(new Date().getFullYear().toString());
      setNewPeriodMonth((new Date().getMonth() + 1).toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear período');
    } finally {
      setCreatingPeriod(false);
    }
  };

  const generatePendingPayments = async () => {
    if (!selectedPeriod) return;

    try {
      setGeneratingPayments(true);
      const response = await fetch('/api/admin/generate-payment-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: selectedPeriod, regenerate: true })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();
      
      // Guardar resultado y mostrar modal
      setGenerationResult({
        message: result.message || 'Proceso completado exitosamente',
        created: result.created || 0,
        updated: result.updated || 0
      });
      setShowResultModal(true);
      
      // Recargar estadísticas
      if (selectedPeriod) {
        await loadPendingStats(selectedPeriod);
      }

      // Actualizar los componentes de gestión de pagos
      if (pendingPaymentsRef.current) {
        pendingPaymentsRef.current.refresh();
      }
      if (paymentDashboardRef.current) {
        paymentDashboardRef.current.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar pagos pendientes');
    } finally {
      setGeneratingPayments(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navegación rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Link href="/admin/monthly-payments/config">
          <Card className="border-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Settings className="h-8 w-8 text-white" />
                <div>
                  <h3 className="text-white font-semibold text-lg">Configuración</h3>
                  <p className="text-purple-100 text-sm">Valores y parámetros del sistema</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/monthly-payments/scheduler">
          <Card className="border-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-white" />
                <div>
                  <h3 className="text-white font-semibold text-lg">Scheduler</h3>
                  <p className="text-indigo-100 text-sm">Envíos automáticos y programación</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-0 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-white" />
              <div>
                <h3 className="text-white font-semibold text-lg">Reportes</h3>
                <p className="text-orange-100 text-sm">Análisis y estadísticas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>      

      {/* Estadísticas de pagos pendientes */}
      {pendingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-blue-400" />
                Total Estudiantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {pendingStats.totalStudents}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5 text-green-400" />
                Monto Esperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(pendingStats.totalExpected)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Monto Recaudado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {formatCurrency(pendingStats.totalCollected)}
              </div>
              <p className="text-xs text-gray-400">
                {pendingStats.collectionRate.toFixed(1)}% recaudado
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-yellow-400" />
                Pagos Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {pendingStats.pendingCount}
              </div>
              <p className="text-xs text-gray-400">
                {pendingStats.overdueCount} vencidos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuración actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-green-400" />
              Mensualidades por Deporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Baile</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">{danceFee ? formatCurrency(danceFee.amount) : '—'}</div>
                  {danceFee && (
                    <p className="text-xs text-gray-500">Desde {new Date(danceFee.validFrom).toLocaleDateString()}</p>
                  )}
                </div>
                <span className="text-gray-300">Voleibol</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">{volleyballFee ? formatCurrency(volleyballFee.amount) : '—'}</div>
                  {volleyballFee && (
                    <p className="text-xs text-gray-500">Desde {new Date(volleyballFee.validFrom).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-blue-400" />
              Período Seleccionado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedPeriod?.toString() || ''} 
              onValueChange={(value) => {
                const periodId = parseInt(value);
                setSelectedPeriod(periodId);
                loadPendingStats(periodId);
              }}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {periods.map((period) => (
                  <SelectItem 
                    key={period.id} 
                    value={period.id.toString()}
                    className="text-white hover:bg-gray-700"
                  >
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-purple-400" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={generatePendingPayments}
                disabled={!selectedPeriod || generatingPayments}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                {generatingPayments ? 'Procesando...' : 'Generar/Actualizar Pagos'}
              </Button>

              <Dialog open={showCreatePeriodDialog} onOpenChange={setShowCreatePeriodDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Período
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-600">
                  <DialogHeader>
                    <DialogTitle className="text-white">Crear Nuevo Período</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="year" className="text-gray-300">Año</Label>
                        <Input
                          id="year"
                          type="number"
                          value={newPeriodYear}
                          onChange={(e) => setNewPeriodYear(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="month" className="text-gray-300">Mes</Label>
                        <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={monthPopoverOpen}
                              className="w-full justify-between bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                            >
                              {newPeriodMonth 
                                ? (() => {
                                    const monthName = new Date(2024, Number.parseInt(newPeriodMonth) - 1).toLocaleString('es', { month: 'long' });
                                    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
                                  })()
                                : "Seleccionar mes..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0 bg-gray-800 border-gray-600" align="start">
                            <Command className="bg-gray-800">
                              <CommandInput 
                                placeholder="Buscar mes..." 
                                className="text-white placeholder:text-gray-400"
                              />
                              <CommandList>
                                <CommandEmpty className="text-gray-400">No se encontró el mes.</CommandEmpty>
                                <CommandGroup>
                                  {Array.from({ length: 12 }, (_, i) => {
                                    const monthNumber = (i + 1).toString();
                                    const monthNameLower = new Date(2024, i).toLocaleString('es', { month: 'long' });
                                    const monthName = monthNameLower.charAt(0).toUpperCase() + monthNameLower.slice(1);
                                    return (
                                      <CommandItem
                                        key={monthNumber}
                                        value={monthNameLower}
                                        onSelect={() => {
                                          setNewPeriodMonth(monthNumber);
                                          setMonthPopoverOpen(false);
                                        }}
                                        className="text-white hover:bg-gray-700 cursor-pointer"
                                      >
                                        <CheckCircle
                                          className={`mr-2 h-4 w-4 ${
                                            newPeriodMonth === monthNumber ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {monthName}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Button 
                      onClick={createPeriod} 
                      disabled={creatingPeriod || !newPeriodYear || !newPeriodMonth}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {creatingPeriod ? 'Creando...' : 'Crear Período'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pagos pendientes */}
      {selectedPeriod && (
        <PendingPaymentsDashboard 
          ref={pendingPaymentsRef}
          periodId={selectedPeriod} 
        />
      )}

      {/* Dashboard de pagos */}
      {selectedPeriod && (
        <PaymentDashboard 
          ref={paymentDashboardRef}
          periodId={selectedPeriod} 
        />
      )}

      {periods.length === 0 && (
        <Card className="bg-gray-800/90 border-gray-600">
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">No hay períodos creados</h3>
            <p className="text-gray-400 mb-4">
              Crea tu primer período de pago para comenzar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de resultado de generación/actualización de pagos */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Proceso Completado
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Resultado de la generación/actualización de pagos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {generationResult && (
              <>
                {(generationResult.created > 0 || generationResult.updated > 0) && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="space-y-2">
                      {generationResult.created > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">Pagos creados:</span>
                          <span className="text-green-400 font-semibold">
                            {generationResult.created}
                          </span>
                        </div>
                      )}
                      {generationResult.updated > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">Pagos actualizados:</span>
                          <span className="text-blue-400 font-semibold">
                            {generationResult.updated}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    💡 Los mensajes de WhatsApp se pueden enviar desde el panel de administración.
                  </p>
                </div>
              </>
            )}
            
            <div className="flex justify-end">
              <Button
                onClick={() => setShowResultModal(false)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de éxito al crear período */}
      <Dialog open={showPeriodSuccessModal} onOpenChange={setShowPeriodSuccessModal}>
        <DialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Período Creado Exitosamente
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              El período ha sido creado correctamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-300 text-sm">
                ✅ El período <span className="font-semibold text-white">{createdPeriodName}</span> ha sido creado exitosamente.
              </p>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 Recuerda que cada pago tendrá su propia fecha de vencimiento según el día de corte del estudiante (15 o 30).
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={() => setShowPeriodSuccessModal(false)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 