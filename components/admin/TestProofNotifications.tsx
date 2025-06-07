'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Phone, Loader2 } from 'lucide-react';

export function TestProofNotifications() {
  const [phoneNumber, setPhoneNumber] = useState('573005771152'); // Número por defecto
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<{
    approved?: any;
    rejected?: any;
  }>({});

  const sendTestNotification = async (type: 'APPROVED' | 'REJECTED') => {
    if (!phoneNumber.trim()) {
      alert('Por favor ingresa un número de teléfono');
      return;
    }

    try {
      setLoading(type);
      
      const response = await fetch('/api/admin/test-proof-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          phoneNumber: phoneNumber.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
      }

      // Guardar resultado
      setResults(prev => ({
        ...prev,
        [type.toLowerCase()]: data
      }));

      console.log(`✅ Notificación ${type} enviada:`, data);
      
    } catch (error) {
      console.error(`Error enviando notificación ${type}:`, error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Prueba de Notificaciones de Comprobantes
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Envía mensajes de prueba para verificar el funcionamiento de las notificaciones de WhatsApp.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Configuración */}
          <div>
            <Label htmlFor="phone" className="text-gray-300">
              Número de teléfono (con código de país)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="573005771152"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: 57XXXXXXXXXX (Colombia) o el código de tu país + número
            </p>
          </div>

          {/* Botones de prueba */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-green-900/20 border-green-600/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto" />
                  <h3 className="font-medium text-white">Comprobante Aprobado</h3>
                  <p className="text-sm text-gray-400">
                    Prueba la notificación que reciben los usuarios cuando su comprobante es aprobado.
                  </p>
                  <Button
                    onClick={() => sendTestNotification('APPROVED')}
                    disabled={loading !== null}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading === 'APPROVED' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Prueba de Aprobación'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-900/20 border-red-600/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <XCircle className="h-8 w-8 text-red-400 mx-auto" />
                  <h3 className="font-medium text-white">Comprobante Rechazado</h3>
                  <p className="text-sm text-gray-400">
                    Prueba la notificación que reciben los usuarios cuando su comprobante es rechazado.
                  </p>
                  <Button
                    onClick={() => sendTestNotification('REJECTED')}
                    disabled={loading !== null}
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-900/30"
                  >
                    {loading === 'REJECTED' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Prueba de Rechazo'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados */}
          {(results.approved || results.rejected) && (
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Resultados de las Pruebas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.approved && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprobación
                      </Badge>
                      <span className="text-sm text-gray-300">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded border border-gray-600">
                      <p className="text-sm text-green-300">
                        ✅ {results.approved.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Estudiante: {results.approved.data.student} | 
                        Teléfono: {results.approved.data.phone} | 
                        Monto: ${results.approved.data.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {results.rejected && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-600 text-white">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rechazo
                      </Badge>
                      <span className="text-sm text-gray-300">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded border border-gray-600">
                      <p className="text-sm text-red-300">
                        ❌ {results.rejected.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Estudiante: {results.rejected.data.student} | 
                        Teléfono: {results.rejected.data.phone} | 
                        Monto: ${results.rejected.data.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información importante */}
          <Card className="bg-blue-900/20 border-blue-600/30">
            <CardContent className="pt-6">
              <h4 className="font-medium text-blue-300 mb-2">ℹ️ Información Importante</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p>• Las notificaciones se envían usando el sistema híbrido implementado.</p>
                <p>• Si los templates personalizados no están aprobados, se usará hello_world + mensaje de seguimiento.</p>
                <p>• En modo desarrollo, verifica los logs de la consola para detalles del envío.</p>
                <p>• El número debe estar registrado como número de prueba en Meta for Developers.</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
