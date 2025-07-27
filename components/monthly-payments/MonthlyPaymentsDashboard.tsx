'use client';

import { useState, useEffect } from 'react';
import { PaymentDashboard } from '@/components/monthly-payments/PaymentDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, Calendar, DollarSign, Eye, FileText, Users, CheckCircle, Clock } from 'lucide-react';
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
  const [currentFee, setCurrentFee] = useState<MonthlyFeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingForms, setGeneratingForms] = useState(false);

  // Formulario de nueva mensualidad
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDescription, setNewFeeDescription] = useState('');
  const [updatingFee, setUpdatingFee] = useState(false);

  // Formulario de nuevo período
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear().toString());
  const [newPeriodMonth, setNewPeriodMonth] = useState((new Date().getMonth() + 1).toString());
  const [newPeriodDueDate, setNewPeriodDueDate] = useState('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);

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

  const loadPeriods = async () => {
    const response = await fetch('/api/admin/payment-periods');
    if (!response.ok) throw new Error('Error al cargar períodos');
    
    const data = await response.json();
    setPeriods(data);
    
    // Seleccionar el período más reciente por defecto
    if (data.length > 0 && !selectedPeriod) {
      setSelectedPeriod(data[0].id);
    }
  };

  const loadCurrentFee = async () => {
    const response = await fetch('/api/admin/monthly-fee');
    if (response.ok) {
      const data = await response.json();
      setCurrentFee(data);
    }
  };

  const updateMonthlyFee = async () => {
    if (!newFeeAmount) return;

    try {
      setUpdatingFee(true);
      const response = await fetch('/api/admin/monthly-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newFeeAmount),
          description: newFeeDescription || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await loadCurrentFee();
      setNewFeeAmount('');
      setNewFeeDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar mensualidad');
    } finally {
      setUpdatingFee(false);
    }
  };

  const createPeriod = async () => {
    if (!newPeriodYear || !newPeriodMonth || !newPeriodDueDate) return;

    try {
      setCreatingPeriod(true);
      const response = await fetch('/api/admin/payment-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(newPeriodYear),
          month: parseInt(newPeriodMonth),
          dueDate: newPeriodDueDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await loadPeriods();
      setNewPeriodYear(new Date().getFullYear().toString());
      setNewPeriodMonth((new Date().getMonth() + 1).toString());
      setNewPeriodDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear período');
    } finally {
      setCreatingPeriod(false);
    }
  };

  const generatePaymentForms = async () => {
    if (!selectedPeriod) return;

    try {
      setGeneratingForms(true);
      const response = await fetch('/api/admin/generate-payment-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: selectedPeriod })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();
      alert(`✅ Se generaron ${result.generated} formularios de pago para todos los estudiantes activos.`);
      
      // Recargar dashboard
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar formularios');
    } finally {
      setGeneratingForms(false);
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Link href="/admin/monthly-payments/config">
          <Card className="border-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-white font-semibold">Configuración</h3>
                  <p className="text-purple-100 text-sm">Valores y parámetros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/monthly-payments/periods">
          <Card className="border-0 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-white font-semibold">Períodos</h3>
                  <p className="text-blue-100 text-sm">Gestionar períodos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/monthly-payments/review">
          <Card className="border-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Eye className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-white font-semibold">Comprobantes</h3>
                  <p className="text-green-100 text-sm">Revisar pagos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/monthly-payments/scheduler">
          <Card className="border-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-white font-semibold">Scheduler</h3>
                  <p className="text-indigo-100 text-sm">Envíos automáticos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-0 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-white" />
              <div>
                <h3 className="text-white font-semibold">Reportes</h3>
                <p className="text-orange-100 text-sm">Análisis y stats</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-4 justify-end">

        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="bg-gray-800/90 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Mensualidad
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white">Configurar Valor de Mensualidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-gray-300">Monto mensual</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newFeeAmount}
                  onChange={(e) => setNewFeeAmount(e.target.value)}
                  placeholder="150000"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-gray-300">Descripción (opcional)</Label>
                <Input
                  id="description"
                  value={newFeeDescription}
                  onChange={(e) => setNewFeeDescription(e.target.value)}
                  placeholder="Mensualidad 2024"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button 
                onClick={updateMonthlyFee} 
                disabled={updatingFee || !newFeeAmount}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {updatingFee ? 'Actualizando...' : 'Actualizar Mensualidad'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
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
                  <Select value={newPeriodMonth} onValueChange={setNewPeriodMonth}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem 
                          key={i + 1} 
                          value={(i + 1).toString()}
                          className="text-white hover:bg-gray-700"
                        >
                          {new Date(2024, i).toLocaleString('es', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="dueDate" className="text-gray-300">Fecha de vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newPeriodDueDate}
                  onChange={(e) => setNewPeriodDueDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button 
                onClick={createPeriod} 
                disabled={creatingPeriod || !newPeriodDueDate}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {creatingPeriod ? 'Creando...' : 'Crear Período'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="bg-red-900/50 border-red-600">
          <CardContent className="p-4">
            <p className="text-red-300">⚠️ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Configuración actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-green-400" />
              Mensualidad Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentFee ? (
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(currentFee.amount)}
                </div>
                {currentFee.description && (
                  <p className="text-sm text-gray-400">
                    {currentFee.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Vigente desde: {new Date(currentFee.validFrom).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="text-gray-400">No configurada</p>
            )}
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
              onValueChange={(value) => setSelectedPeriod(parseInt(value))}
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
          <CardContent className="space-y-2">
            <Button 
              onClick={generatePaymentForms}
              disabled={!selectedPeriod || generatingForms}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generatingForms ? 'Generando...' : 'Generar Formularios'}
            </Button>
            <Button 
              asChild
              variant="outline"
              className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              size="sm"
            >
              <Link href="/admin/monthly-payments/review">
                <CheckCircle className="h-4 w-4 mr-2" />
                Ver Comprobantes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de pagos */}
      {selectedPeriod && (
        <PaymentDashboard periodId={selectedPeriod} />
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
    </div>
  );
} 