'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TestSchedulerPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testExecutor = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/scheduled-whatsapp/execute', {
        method: 'POST'
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setTesting(false);
    }
  };

  const testCronEndpoint = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/cron/whatsapp-scheduler');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🧪 Test del Sistema de Envíos Programados
          </h1>
          <p className="text-gray-400">
            Prueba las APIs del sistema de envíos programados de WhatsApp
          </p>
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <h3 className="text-yellow-400 font-medium mb-2">⚠️ Importante para Desarrollo Local</h3>
            <p className="text-yellow-300 text-sm">
              Los cron jobs de Vercel solo funcionan en <strong>producción</strong>. 
              En desarrollo local debes usar los botones de "Ejecutar Manualmente" para probar los envíos programados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white">Verificar Envíos</CardTitle>
              <p className="text-gray-400 text-sm">
                Ver qué envíos están programados y cuáles deberían ejecutarse
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  setTesting(true);
                  try {
                    const response = await fetch('/api/admin/scheduled-whatsapp/test');
                    const data = await response.json();
                    setResult(data);
                  } catch (error) {
                    setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
                  } finally {
                    setTesting(false);
                  }
                }}
                disabled={testing}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {testing ? 'Verificando...' : 'Verificar Envíos Programados'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white">Ejecutar Manualmente</CardTitle>
              <p className="text-gray-400 text-sm">
                Forzar ejecución de envíos programados (para testing)
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  setTesting(true);
                  try {
                    const response = await fetch('/api/admin/scheduled-whatsapp/test', {
                      method: 'POST'
                    });
                    const data = await response.json();
                    setResult(data);
                  } catch (error) {
                    setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
                  } finally {
                    setTesting(false);
                  }
                }}
                disabled={testing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {testing ? 'Ejecutando...' : 'Ejecutar AHORA (Force)'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white">Test Cron Endpoint</CardTitle>
              <p className="text-gray-400 text-sm">
                Prueba el endpoint que será llamado por el cron job
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testCronEndpoint}
                disabled={testing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {testing ? 'Ejecutando...' : 'Test /api/cron/whatsapp-scheduler'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white">Test Notificaciones Comprobantes</CardTitle>
              <p className="text-gray-400 text-sm">
                Prueba el envío de notificaciones cuando se aprueban/rechazan comprobantes
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={async () => {
                  setTesting(true);
                  try {
                    const response = await fetch('/api/admin/test-payment-notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'APPROVED' })
                    });
                    const data = await response.json();
                    setResult(data);
                  } catch (error) {
                    setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
                  } finally {
                    setTesting(false);
                  }
                }}
                disabled={testing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {testing ? 'Enviando...' : 'Test Notificación APROBADO'}
              </Button>
              
              <Button 
                onClick={async () => {
                  setTesting(true);
                  try {
                    const response = await fetch('/api/admin/test-payment-notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'REJECTED' })
                    });
                    const data = await response.json();
                    setResult(data);
                  } catch (error) {
                    setResult({ error: error instanceof Error ? error.message : 'Error desconocido' });
                  } finally {
                    setTesting(false);
                  }
                }}
                disabled={testing}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {testing ? 'Enviando...' : 'Test Notificación RECHAZADO'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultado */}
        {result && (
          <Card className="bg-gray-800/90 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                📊 Resultado
                {result.error ? (
                  <Badge className="bg-red-900/50 text-red-300 border-red-600">Error</Badge>
                ) : (
                  <Badge className="bg-green-900/50 text-green-300 border-green-600">Éxito</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Información del sistema */}
        <Card className="bg-gray-800/90 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">ℹ️ Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-white mb-2">APIs Disponibles:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• <code>GET/POST /api/admin/scheduled-whatsapp</code> - Gestionar envíos programados</li>
                <li>• <code>POST /api/admin/scheduled-whatsapp/execute</code> - Ejecutar envíos programados</li>
                <li>• <code>GET /api/cron/whatsapp-scheduler</code> - Endpoint para cron jobs</li>
                <li>• <code>PUT /api/admin/payment-proofs/[id]/review</code> - Revisar comprobantes (con notificación WhatsApp)</li>
                <li>• <code>POST /api/admin/test-payment-notifications</code> - Probar notificaciones de comprobantes</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Configuración del Cron:</h4>
              <div className="bg-gray-900 p-3 rounded text-sm text-gray-300">
                <p>Vercel Cron: Cada 5 minutos (*/5 * * * *)</p>
                <p>Endpoint: /api/cron/whatsapp-scheduler</p>
                <p>Configurado en: vercel.json</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Variables de Entorno Requeridas:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• <code>WHATSAPP_ACCESS_TOKEN</code> - Token de WhatsApp Business API</li>
                <li>• <code>WHATSAPP_PHONE_NUMBER_ID</code> - ID del número de teléfono</li>
                <li>• <code>NEXT_PUBLIC_BASE_URL</code> - URL base de la aplicación</li>
                <li>• <code>CRON_SECRET</code> - Clave secreta para cron jobs (opcional)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">🆕 Nueva Funcionalidad - Notificaciones de Comprobantes:</h4>
              <div className="bg-green-900/20 p-3 rounded text-sm text-green-300">
                <p className="mb-2">✅ <strong>Implementado:</strong> Notificaciones automáticas por WhatsApp cuando se aprueban/rechazan comprobantes</p>
                <ul className="space-y-1 text-xs">
                  <li>• Cuando un admin aprueba un comprobante → El usuario recibe WhatsApp de confirmación</li>
                  <li>• Cuando un admin rechaza un comprobante → El usuario recibe WhatsApp con motivo</li>
                  <li>• Cuando requiere revisión → El usuario recibe WhatsApp informativo</li>
                  <li>• Mensajes personalizados con detalles del estudiante, período y monto</li>
                  <li>• Funciona automáticamente en el componente PaymentProofReview</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 