'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdvancedPagination } from '@/components/ui/advanced-pagination';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Send, 
  CheckCircle, 
  Phone,
  AlertTriangle,
  Users,
  Search,
  X
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  parentPhone?: string;
  hasForm: boolean;
}

interface WhatsAppSenderProps {
  periodId: number;
  periodName: string;
}

export function WhatsAppSender({ periodId, periodName }: WhatsAppSenderProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Cargar estudiantes
  useEffect(() => {
    loadStudents();
  }, [periodId, currentPage, limit, searchDebounced]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1); // Resetear página al buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      });

      // Agregar búsqueda si existe
      if (searchDebounced.trim()) {
        params.append('search', searchDebounced.trim());
      }

      const response = await fetch(`/api/admin/payment-dashboard/${periodId}/students?${params}`);
      const data = await response.json();

      if (response.ok) {
        setStudents(data.students);
        setPagination(data.pagination);
      } else {
        console.error('Error loading students:', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedStudents([]);
    setSendToAll(false);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    setSelectedStudents([]);
    setSendToAll(false);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setSearchDebounced('');
    setCurrentPage(1);
    setSelectedStudents([]);
    setSendToAll(false);
  };

  const handleSendWhatsApp = async () => {
    if (selectedStudents.length === 0 && !sendToAll) {
      alert('Selecciona al menos un estudiante');
      return;
    }

    setSending(true);
    setResults(null);

    try {
      // Si se va a enviar a todos, obtener todos los estudiantes del período
      let studentIdsToSend = selectedStudents;
      if (sendToAll) {
        try {
          const allStudentsResponse = await fetch(`/api/admin/payment-dashboard/${periodId}/students?page=1&limit=1000`);
          const allStudentsData = await allStudentsResponse.json();
          if (allStudentsResponse.ok) {
            const allEligibleStudents = allStudentsData.students.filter((s: Student) => s.hasForm && s.parentPhone);
            studentIdsToSend = allEligibleStudents.map((s: Student) => s.id);
          }
        } catch (error) {
          console.error('Error obteniendo todos los estudiantes:', error);
          alert('Error al obtener la lista completa de estudiantes');
          setSending(false);
          return;
        }
      }

      const response = await fetch('/api/admin/send-payment-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId,
          studentIds: studentIdsToSend,
          sendToAll: false // Siempre enviar studentIds específicos
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

  if (loading) {
    return (
      <Card className="bg-gray-800/90 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-400" />
            Envío Automático por WhatsApp - {periodName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            <span className="ml-3 text-gray-300">Cargando estudiantes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

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

          {/* Barra de búsqueda */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={handleSearchClear}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

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
            {eligibleStudents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  {searchTerm ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p>No se encontraron estudiantes que coincidan con "{searchTerm}"</p>
                    </>
                  ) : (
                    <>
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p>No hay estudiantes elegibles en esta página</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              eligibleStudents.map((student) => (
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
              ))
            )}
           </div>

          {/* Paginación */}
          <AdvancedPagination
            pagination={pagination}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            itemName="estudiantes"
            limitOptions={[5, 10, 20, 30, 50]}
          />

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
