'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  User,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StudentDebtInfo {
  student: {
    id: number;
    name: string;
    phone: string;
    hasDebt: boolean;
  };
  partialPaymentDebts: Array<{
    id: number;
    type: string;
    concept: string;
    amount: number;
    paidAmount: number;
    expectedAmount: number;
    dueDate: string;
    period: string;
    isOverdue: boolean;
  }>;
  regularDebts: Array<{
    id: number;
    type: string;
    concept: string;
    amount: number;
    dueDate: string;
    isOverdue: boolean;
    lastReminder?: string;
  }>;
  totals: {
    partialPaymentDebt: number;
    regularDebt: number;
    totalDebt: number;
    debtCount: number;
  };
}

export function PartialPaymentDemo() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [debtInfo, setDebtInfo] = useState<StudentDebtInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentDebtInfo = async () => {
    if (!studentId.trim()) {
      setError('Ingresa un ID de estudiante válido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/student-debt-info/${studentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener información');
      }
      
      const data = await response.json();
      setDebtInfo(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setDebtInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const getDebtStatusBadge = (isOverdue: boolean) => {
    return isOverdue ? (
      <Badge className="bg-red-900/50 text-red-300 border-red-600">
        <AlertCircle className="h-3 w-3 mr-1" />
        Vencido
      </Badge>
    ) : (
      <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-600">
        <Clock className="h-3 w-3 mr-1" />
        Pendiente
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Demo: Sistema de Pagos Parciales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-gray-300">ID del Estudiante (Cédula)</Label>
                <Input
                  type="number"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ej: 12345678"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={fetchStudentDebtInfo}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Consultando...' : 'Consultar Deudas'}
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-600 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {debtInfo && (
        <div className="space-y-6">
          {/* Información del estudiante */}
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Estudiante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400">Nombre</Label>
                  <p className="text-white font-medium">{debtInfo.student.name}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Teléfono</Label>
                  <p className="text-white">{debtInfo.student.phone}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Estado de Deuda</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {debtInfo.student.hasDebt ? (
                      <Badge className="bg-red-900/50 text-red-300 border-red-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Con Deuda
                      </Badge>
                    ) : (
                      <Badge className="bg-green-900/50 text-green-300 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Al Día
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de deudas */}
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumen de Deudas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-400 font-medium">Pagos Parciales</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(debtInfo.totals.partialPaymentDebt)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {debtInfo.partialPaymentDebts.length} pendiente(s)
                  </p>
                </div>

                <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-medium">Deudas Regulares</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(debtInfo.totals.regularDebt)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {debtInfo.regularDebts.length} deuda(s)
                  </p>
                </div>

                <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-purple-400" />
                    <span className="text-purple-400 font-medium">Total Adeudado</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(debtInfo.totals.totalDebt)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {debtInfo.totals.debtCount} total
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Estado General</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {debtInfo.totals.totalDebt > 0 ? 'Con Deuda' : 'Al Día'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Actualizado ahora
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deudas por pagos parciales */}
          {debtInfo.partialPaymentDebts.length > 0 && (
            <Card className="bg-gray-800/90 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Saldos Pendientes (Pagos Parciales)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {debtInfo.partialPaymentDebts.map((debt) => (
                    <div key={debt.id} className="bg-orange-900/10 border border-orange-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-white">{debt.concept}</h4>
                          <p className="text-sm text-gray-400">Período: {debt.period}</p>
                        </div>
                        {getDebtStatusBadge(debt.isOverdue)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-400">Monto Total</Label>
                          <p className="text-white">{formatCurrency(debt.expectedAmount)}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Pagado</Label>
                          <p className="text-green-400">{formatCurrency(debt.paidAmount)}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Saldo Pendiente</Label>
                          <p className="text-orange-400 font-medium">{formatCurrency(debt.amount)}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Vence</Label>
                          <p className="text-white">
                            {new Date(debt.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progreso de pago</span>
                          <span>{((debt.paidAmount / debt.expectedAmount) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-600 to-orange-400 h-2 rounded-full"
                            style={{ width: `${(debt.paidAmount / debt.expectedAmount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deudas regulares */}
          {debtInfo.regularDebts.length > 0 && (
            <Card className="bg-gray-800/90 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Deudas Regulares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {debtInfo.regularDebts.map((debt) => (
                    <div key={debt.id} className="bg-red-900/10 border border-red-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-white">{debt.concept}</h4>
                        </div>
                        {getDebtStatusBadge(debt.isOverdue)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-400">Monto Adeudado</Label>
                          <p className="text-red-400 font-medium">{formatCurrency(debt.amount)}</p>
                        </div>
                        <div>
                          <Label className="text-gray-400">Fecha de Vencimiento</Label>
                          <p className="text-white">
                            {new Date(debt.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        {debt.lastReminder && (
                          <div>
                            <Label className="text-gray-400">Último Recordatorio</Label>
                            <p className="text-gray-300">
                              {new Date(debt.lastReminder).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {debtInfo.totals.totalDebt === 0 && (
            <Card className="bg-green-900/20 border-green-600">
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2 text-white">¡Sin Deudas Pendientes!</h3>
                <p className="text-green-300">
                  Este estudiante está al día con todos sus pagos.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
} 