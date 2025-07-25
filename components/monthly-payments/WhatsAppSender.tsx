'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Send, 
  CheckCircle, 
  Phone,
  AlertTriangle,
  Users
} from 'lucide-react';

interface Student {
  id: string; // Cambiado de number a string para coincidir con el modelo de Student
  name: string;
  parentPhone?: string;
  hasForm: boolean;
}

interface WhatsAppSenderProps {
  periodId: number;
  periodName: string;
  students: Student[];
}

export function WhatsAppSender({ periodId, periodName, students }: WhatsAppSenderProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);

  // Filtrar estudiantes que tienen formulario y teléfono
  const eligibleStudents = students.filter(s => s.hasForm && s.parentPhone);
  const studentsWithoutPhone = students.filter(s => s.hasForm && !s.parentPhone);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(eligibleStudents.map(s => s.id));
      setSendToAll(true);
    } else {
      setSelectedStudents([]);
      setSendToAll(false);
    }
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      setSendToAll(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (selectedStudents.length === 0 && !sendToAll) {
      alert('Selecciona al menos un estudiante');
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const response = await fetch('/api/admin/send-payment-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId,
          studentIds: sendToAll ? undefined : selectedStudents,
          sendToAll
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar mensajes');
      }

      setResults(data.results);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-gray-800/90 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-400" />
          Envío Automático por WhatsApp - {periodName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-900/30 p-3 rounded-lg border border-green-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300">Con teléfono</span>
              </div>
              <div className="text-lg font-bold text-green-400">{eligibleStudents.length}</div>
            </div>
            
            <div className="bg-yellow-900/30 p-3 rounded-lg border border-yellow-600">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">Sin teléfono</span>
              </div>
              <div className="text-lg font-bold text-yellow-400">{studentsWithoutPhone.length}</div>
            </div>
            
            <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-600">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300">Seleccionados</span>
              </div>
              <div className="text-lg font-bold text-blue-400">{sendToAll ? eligibleStudents.length : selectedStudents.length}</div>
            </div>
          </div>

          {/* Estudiantes sin teléfono */}
          {studentsWithoutPhone.length > 0 && (
            <Alert className="border-yellow-600 bg-yellow-900/50">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <strong>Estudiantes sin teléfono:</strong> {studentsWithoutPhone.map(s => s.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Controles de selección */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={sendToAll}
                onCheckedChange={handleSelectAll}
                className="border-gray-500"
              />
              <label htmlFor="select-all" className="text-sm text-gray-300">
                Seleccionar todos ({eligibleStudents.length})
              </label>
            </div>

            <Button
              onClick={handleSendWhatsApp}
              disabled={sending || (selectedStudents.length === 0 && !sendToAll)}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar WhatsApp ({sendToAll ? eligibleStudents.length : selectedStudents.length})
                </>
              )}
            </Button>
          </div>

          {/* Lista de estudiantes */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {eligibleStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={sendToAll || selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => handleStudentSelect(student.id, checked as boolean)}
                    disabled={sendToAll}
                    className="border-gray-500"
                  />
                  <div>
                    <p className="text-white font-medium">{student.name}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Phone className="h-3 w-3" />
                      {student.parentPhone}
                    </div>
                  </div>
                </div>
                
                <Badge className="bg-green-900/50 text-green-300 border-green-600">
                  Elegible
                </Badge>
              </div>
            ))}
          </div>

          {/* Resultados */}
          {results && (
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Resultados del Envío</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{results.sent}</div>
                    <div className="text-sm text-gray-400">Enviados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{results.failed}</div>
                    <div className="text-sm text-gray-400">Fallidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{results.total}</div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-400">Errores:</h4>
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-300 bg-red-900/20 p-2 rounded border border-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
