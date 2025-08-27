'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  DollarSign, 
  Calendar, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft,
  History,
  Info
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface FeeConfigItem {
  id: number;
  amount: number;
  description?: string;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  createdBy?: string;
  createdAt: Date;
  sport?: 'DANCE' | 'VOLLEYBALL';
}

export function MonthlyFeeConfig() {
  const [danceConfig, setDanceConfig] = useState<FeeConfigItem | null>(null);
  const [volleyballConfig, setVolleyballConfig] = useState<FeeConfigItem | null>(null);
  const [configHistory, setConfigHistory] = useState<FeeConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSport, setNewSport] = useState<'DANCE' | 'VOLLEYBALL'>('DANCE');

  useEffect(() => {
    loadConfigData();
  }, []);

  const loadConfigData = async () => {
    try {
      setLoading(true);
      
      // Cargar configuraciones actuales por deporte
      const currentResponse = await fetch('/api/admin/monthly-fee');
      if (currentResponse.ok) {
        const data = await currentResponse.json();
        setDanceConfig(data?.dance || null);
        setVolleyballConfig(data?.volleyball || null);
        const prefill = data?.dance || data?.volleyball;
        if (prefill) {
          setNewAmount(prefill.amount.toString());
          setNewDescription(prefill.description || '');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!newAmount || parseFloat(newAmount) <= 0) {
      toast.error('El monto debe ser mayor a cero');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/monthly-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newAmount),
          description: newDescription || undefined,
          sport: newSport
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar configuración');
      }

      const savedConfig = await response.json();
      if (savedConfig.sport === 'DANCE') setDanceConfig(savedConfig);
      if (savedConfig.sport === 'VOLLEYBALL') setVolleyballConfig(savedConfig);
      
      toast.success('Configuración guardada exitosamente');
      
      // Agregar a historial local
      const previous = savedConfig.sport === 'DANCE' ? danceConfig : volleyballConfig;
      if (previous) setConfigHistory(prev => [previous, ...prev]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar configuración';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/monthly-payments">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Configuración de Mensualidades</h1>
          </div>
        </div>
      </div>

      {error && (
        <Alert className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuración Actual */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado Actual por Deporte */}
          <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Configuraciones Actuales por Deporte</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 font-medium">Baile</p>
                    <p className="text-3xl font-bold text-green-400">{danceConfig ? formatCurrency(danceConfig.amount) : '—'}</p>
                  </div>
                  {danceConfig && <Badge className="bg-green-500 text-white">Activo</Badge>}
                </div>
                {danceConfig?.description && (
                  <p className="text-gray-400 mt-2">{danceConfig.description}</p>
                )}
                {danceConfig && (
                  <p className="text-xs text-gray-500 mt-1">Vigente desde: {new Date(danceConfig.validFrom).toLocaleDateString('es-ES')}</p>
                )}
              </div>
              <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 font-medium">Voleibol</p>
                    <p className="text-3xl font-bold text-green-400">{volleyballConfig ? formatCurrency(volleyballConfig.amount) : '—'}</p>
                  </div>
                  {volleyballConfig && <Badge className="bg-green-500 text-white">Activo</Badge>}
                </div>
                {volleyballConfig?.description && (
                  <p className="text-gray-400 mt-2">{volleyballConfig.description}</p>
                )}
                {volleyballConfig && (
                  <p className="text-xs text-gray-500 mt-1">Vigente desde: {new Date(volleyballConfig.validFrom).toLocaleDateString('es-ES')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Nueva Configuración */}
          <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                <span>Nueva Configuración</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Deporte *</Label>
                    <div className="mt-1">
                      <select
                        value={newSport}
                        onChange={(e) => setNewSport(e.target.value as 'DANCE' | 'VOLLEYBALL')}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2"
                      >
                        <option value="DANCE">Baile</option>
                        <option value="VOLLEYBALL">Voleibol</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="amount" className="text-white">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="150000"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">
                    Descripción (Opcional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Ej: Mensualidad 2024 - Incluye todas las clases"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>

                {/* Preview */}
                {newAmount && parseFloat(newAmount) > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500 rounded-lg p-4">
                    <p className="text-purple-400 font-medium">Vista Previa ({newSport})</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(parseFloat(newAmount))}
                    </p>
                    {newDescription && (
                      <p className="text-gray-300 text-sm mt-2">{newDescription}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <Button 
                  onClick={handleSaveConfig}
                  disabled={saving || !newAmount || parseFloat(newAmount) <= 0}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Lateral - Información */}
        <div className="space-y-6">
          <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <span>Información Importante</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-300">
                    Los cambios en la mensualidad se aplicarán a todos los nuevos períodos creados
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-300">
                    Los períodos existentes mantendrán su valor original
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-300">
                    El historial de configuraciones se mantiene para auditoría
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historial (si hay datos) */}
          {configHistory.length > 0 && (
            <Card className="border-0 bg-gray-800/90 shadow-2xl backdrop-blur-sm border border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <History className="h-5 w-5 text-blue-400" />
                  <span>Historial</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {configHistory.slice(0, 5).map((config, index) => (
                  <div key={config.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">
                        {formatCurrency(config.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(config.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <Badge variant="secondary">Inactivo</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 