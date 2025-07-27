'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  Phone, 
  PhoneOff,
  X, 
  CheckCircle, 
  DollarSign
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  debtAmount?: number;
  paymentStatus?: string;
}

interface StudentSelectorProps {
  onStudentsSelected: (studentIds: string[]) => void;
  selectedStudents?: string[];
  title?: string;
}

export function StudentSelector({ 
  onStudentsSelected, 
  selectedStudents = [],
  title = "Seleccionar Estudiantes"
}: StudentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedStudents);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Cargar estudiantes cuando se abra el modal
  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen]);

  // Filtrar estudiantes
  useEffect(() => {
    let filtered = allStudents;

    // Aplicar filtro
    switch (activeFilter) {
      case 'withDebt':
        filtered = filtered.filter(s => s.debtAmount && s.debtAmount > 0);
        break;
      case 'overdue':
        filtered = filtered.filter(s => s.paymentStatus === 'OVERDUE');
        break;
      case 'withPhone':
        filtered = filtered.filter(s => s.phone && s.phone.trim() !== '');
        break;
      case 'active':
        filtered = filtered.filter(s => s.isActive);
        break;
    }

    // Aplicar búsqueda
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }, [allStudents, searchTerm, activeFilter]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Datos de ejemplo
      const mockStudents: Student[] = [
        { id: '1', name: 'María González', phone: '+573001234567', isActive: true, debtAmount: 0 },
        { id: '2', name: 'Juan Pérez', phone: '+573007654321', isActive: true, debtAmount: 150000, paymentStatus: 'OVERDUE' },
        { id: '3', name: 'Ana Rodríguez', phone: null, isActive: true, debtAmount: 75000, paymentStatus: 'PARTIAL' },
        { id: '4', name: 'Carlos López', phone: '+573001112223', isActive: false, debtAmount: 0 },
        { id: '5', name: 'Laura Martínez', phone: '+573004445556', isActive: true, debtAmount: 0 },
        { id: '6', name: 'Pedro Silva', phone: '+573007778889', isActive: true, debtAmount: 200000, paymentStatus: 'OVERDUE' },
        { id: '7', name: 'Carmen Vega', phone: null, isActive: true, debtAmount: 0 },
        { id: '8', name: 'Roberto Díaz', phone: '+573009990001', isActive: true, debtAmount: 50000, paymentStatus: 'PARTIAL' },
      ];
      setAllStudents(mockStudents);
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredStudents.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    onStudentsSelected(selectedIds);
    setIsOpen(false);
  };

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'withDebt':
        return allStudents.filter(s => s.debtAmount && s.debtAmount > 0).length;
      case 'overdue':
        return allStudents.filter(s => s.paymentStatus === 'OVERDUE').length;
      case 'withPhone':
        return allStudents.filter(s => s.phone && s.phone.trim() !== '').length;
      case 'active':
        return allStudents.filter(s => s.isActive).length;
      default:
        return allStudents.length;
    }
  };

  const getStudentStatusBadge = (student: Student) => {
    if (!student.isActive) {
      return <Badge variant="secondary" className="text-xs">Inactivo</Badge>;
    }
    if (student.paymentStatus === 'OVERDUE') {
      return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
    }
    if (student.paymentStatus === 'PARTIAL') {
      return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">Parcial</Badge>;
    }
    return <Badge variant="default" className="text-xs">Al día</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Users className="h-4 w-4 mr-2" />
          {selectedStudents.length > 0 
            ? `${selectedStudents.length} estudiante(s) seleccionado(s)`
            : 'Seleccionar Estudiantes'
          }
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-gray-900 border-gray-700">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-blue-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar estudiantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-blue-600 text-white border border-blue-600' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              Todos ({getFilterCount('all')})
            </button>
            <button
              onClick={() => setActiveFilter('withDebt')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === 'withDebt' 
                  ? 'bg-red-600 text-white border border-red-600' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              Con Deuda ({getFilterCount('withDebt')})
            </button>
            <button
              onClick={() => setActiveFilter('overdue')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === 'overdue' 
                  ? 'bg-orange-600 text-white border border-orange-600' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              Vencidos ({getFilterCount('overdue')})
            </button>
            <button
              onClick={() => setActiveFilter('withPhone')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === 'withPhone' 
                  ? 'bg-green-600 text-white border border-green-600' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              Con Teléfono ({getFilterCount('withPhone')})
            </button>
          </div>

          {/* Acciones */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSelectAll} variant="outline">
                Seleccionar Todos
              </Button>
              <Button size="sm" onClick={handleDeselectAll} variant="outline">
                Deseleccionar Todos
              </Button>
            </div>
            <div className="text-sm text-gray-300">
              {selectedIds.length} de {filteredStudents.length} seleccionados
            </div>
          </div>

          {/* Lista */}
          <ScrollArea className="h-96 border border-gray-600 rounded-md bg-gray-800">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-400">Cargando estudiantes...</div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No se encontraron estudiantes
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center space-x-3 p-3 rounded-md border transition-colors cursor-pointer ${
                      selectedIds.includes(student.id) 
                        ? 'bg-blue-600/20 border-blue-500' 
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                    onClick={() => handleStudentToggle(student.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      className="h-4 w-4"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate text-white">{student.name}</span>
                        {getStudentStatusBadge(student)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          {student.phone ? (
                            <>
                              <Phone className="h-3 w-3 text-green-400" />
                              <span className="text-gray-300">{student.phone}</span>
                            </>
                          ) : (
                            <>
                              <PhoneOff className="h-3 w-3 text-red-400" />
                              <span className="text-red-400">Sin teléfono</span>
                            </>
                          )}
                        </div>
                        
                        {student.debtAmount && student.debtAmount > 0 && (
                          <div className="flex items-center gap-1 text-red-400">
                            <DollarSign className="h-3 w-3" />
                            <span>Deuda: ${student.debtAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar ({selectedIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 