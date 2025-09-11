"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Trophy as TrophyIcon, Search as SearchIcon, Users as UsersIcon, Check as CheckIcon, X as XIcon, Clock as ClockIcon } from "lucide-react";

interface DanceClass {
  id: number;
  name: string;
  sport: string;
  level: string;
  trainer: {
    id: number;
    name: string;
  };
  enrollments: {
    student: {
      id: string;
      name: string;
    };
  }[];
}

interface MatchRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: DanceClass[];
  onMatchCreated: () => void;
}

export function MatchRegistrationModal({
  isOpen,
  onClose,
  classes,
  onMatchCreated,
}: MatchRegistrationModalProps) {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [matchDate, setMatchDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [allVolleyballClasses, setAllVolleyballClasses] = useState<DanceClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("class");
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [studentAttendances, setStudentAttendances] = useState<{[key: string]: string}>({});

  // Cargar todas las clases de volleyball cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadAllVolleyballClasses();
    }
  }, [isOpen]);

  const loadAllVolleyballClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch("/api/classes?active=true&pageSize=1000");
      const data = await response.json();
      
      if (data.success) {
        const volleyballClasses = data.classes.filter((cls: DanceClass) => cls.sport === "VOLLEYBALL");
        setAllVolleyballClasses(volleyballClasses);
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudieron cargar las clases de volleyball",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading volleyball classes:", error);
      toast({
        title: "❌ Error",
        description: "Error al cargar las clases de volleyball",
        variant: "destructive",
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  // Usar las clases cargadas específicamente para volleyball
  const volleyballClasses = allVolleyballClasses;

  // Cargar estudiantes de la clase seleccionada
  const loadClassStudents = async (classId: number) => {
    try {
      const response = await fetch(`/api/classes/${classId}/students`);
      const data = await response.json();
      
      if (data.success) {
        setClassStudents(data.students);
        // Inicializar sin ningún estado seleccionado
        const initialAttendances: {[key: string]: string} = {};
        setStudentAttendances(initialAttendances);
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudieron cargar los estudiantes de la clase",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading class students:", error);
      toast({
        title: "❌ Error",
        description: "Error al cargar los estudiantes",
        variant: "destructive",
      });
    }
  };

  // Filtrar clases basado en el término de búsqueda
  const filteredClasses = useMemo(() => {
    let filtered = volleyballClasses;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = volleyballClasses.filter(cls => 
        cls.name.toLowerCase().includes(term) ||
        cls.trainer.name.toLowerCase().includes(term)
      );
    }
    
    // Limitar resultados: 3 por defecto, 5 máximo al buscar
    const maxResults = searchTerm.trim() ? 5 : 3;
    return filtered.slice(0, maxResults);
  }, [volleyballClasses, searchTerm]);

  const selectedClass = volleyballClasses.find(c => c.id.toString() === selectedClassId);

  const handleSubmit = async () => {
    if (!selectedClassId || !matchDate) {
      toast({
        title: "❌ Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(matchDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (selectedDate < now) {
      toast({
        title: "❌ Error",
        description: "La fecha del partido no puede ser en el pasado",
        variant: "destructive",
      });
      return;
    }

    // Validar que todos los estudiantes tengan un estado de asistencia seleccionado
    const studentsWithoutAttendance = classStudents.filter(student => 
      !studentAttendances[student.id] || studentAttendances[student.id] === ""
    );
    
    if (studentsWithoutAttendance.length > 0) {
      toast({
        title: "❌ Error",
        description: `Debes seleccionar el estado de asistencia para todos los estudiantes. Faltan ${studentsWithoutAttendance.length} estudiante(s).`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: parseInt(selectedClassId),
          matchDate: selectedDate.toISOString(),
          notes: notes.trim() || null,
          studentAttendances: studentAttendances,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Partido registrado",
          description: `Partido creado exitosamente para ${selectedClass?.name}`,
        });
        
        // Limpiar formulario
        setSelectedClassId("");
        setMatchDate("");
        setNotes("");
        setClassStudents([]);
        setStudentAttendances({});
        setActiveTab("class");
        
        // Cerrar modal y notificar al componente padre
        onClose();
        onMatchCreated();
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "No se pudo crear el partido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "❌ Error",
        description: "Error al crear el partido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (activeTab === "class") {
      if (!selectedClassId) {
        toast({
          title: "❌ Error",
          description: "Por favor selecciona una clase de volleyball",
          variant: "destructive",
        });
        return;
      }
      setActiveTab("details");
    } else if (activeTab === "details") {
      if (!matchDate) {
        toast({
          title: "❌ Error",
          description: "Por favor selecciona la fecha del partido",
          variant: "destructive",
        });
        return;
      }
      setActiveTab("attendance");
    }
  };

  const handlePrevious = () => {
    if (activeTab === "details") {
      setActiveTab("class");
    } else if (activeTab === "attendance") {
      setActiveTab("details");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedClassId("");
      setMatchDate("");
      setNotes("");
      setSearchTerm("");
      setAllVolleyballClasses([]);
      setClassStudents([]);
      setStudentAttendances({});
      setActiveTab("class");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-yellow-500" />
            Registrar Partido de Volleyball
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700">
            {(() => {
              let classTabClass = "text-xs bg-gray-600 text-gray-400";
              if (activeTab === "class") {
                classTabClass = "text-xs bg-yellow-600 text-white";
              } else if (selectedClassId) {
                classTabClass = "text-xs bg-green-600/20 text-green-400";
              }
              return (
                <TabsTrigger 
                  value="class" 
                  className={classTabClass}
                  disabled={true}
                >
                  Clase
                </TabsTrigger>
              );
            })()}
            {(() => {
              let detailsTabClass = "text-xs bg-gray-600 text-gray-400";
              if (activeTab === "details") {
                detailsTabClass = "text-xs bg-yellow-600 text-white";
              } else if (matchDate) {
                detailsTabClass = "text-xs bg-green-600/20 text-green-400";
              }
              return (
                <TabsTrigger 
                  value="details" 
                  className={detailsTabClass}
                  disabled={true}
                >
                  Detalles
                </TabsTrigger>
              );
            })()}
            <TabsTrigger 
              value="attendance" 
              className={`text-xs ${
                activeTab === "attendance" 
                  ? "bg-yellow-600 text-white" 
                  : "bg-gray-600 text-gray-400"
              }`}
              disabled={true}
            >
              Asistencia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="class" className="space-y-3 py-3">
            {/* Búsqueda de Clase */}
            <div className="space-y-2">
              <Label htmlFor="class-search" className="text-sm font-medium">
                Buscar Clase de Volleyball *
              </Label>
              <div className="relative">
                <Input
                  id="class-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre de clase o profesor..."
                  disabled={isLoading}
                  className="bg-gray-700 border-gray-600 text-white pr-10"
                />
                <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Lista de Clases Filtradas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Clases de Volleyball Disponibles ({filteredClasses.length}{searchTerm.trim() ? '/5' : '/3'})
              </Label>
              <div className="max-h-40 overflow-y-auto bg-gray-700/50 rounded-lg border border-gray-600 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
                {(() => {
                  if (loadingClasses) {
                    return (
                      <div className="p-4 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-2"></div>
                        Cargando clases de volleyball...
                      </div>
                    );
                  }
                  
                  if (filteredClasses.length === 0) {
                    const message = searchTerm 
                      ? "No se encontraron clases con ese criterio" 
                      : "No hay clases de volleyball disponibles";
                    return (
                      <div className="p-4 text-center text-gray-400">
                        {message}
                      </div>
                    );
                  }
                  
                  // Verificar si hay más clases disponibles
                  const hasMoreClasses = searchTerm.trim() 
                    ? volleyballClasses.filter(cls => {
                        const term = searchTerm.toLowerCase();
                        return cls.name.toLowerCase().includes(term) || cls.trainer.name.toLowerCase().includes(term);
                      }).length > 5
                    : volleyballClasses.length > 3;
                  
                  return (
                    <div className="p-1 space-y-0.5 w-full">
                      {filteredClasses.map((danceClass) => {
                        // Mapear niveles para mostrar texto más amigable
                        const levelMap: { [key: string]: string } = {
                          'BEGINNER': 'Principiante',
                          'INTERMEDIATE': 'Intermedio',
                          'ADVANCED': 'Avanzado'
                        };
                        
                        const displayLevel = levelMap[danceClass.level] || danceClass.level;
                        
                        return (
                           <button
                             key={danceClass.id}
                             onClick={() => {
                               setSelectedClassId(danceClass.id.toString());
                               loadClassStudents(danceClass.id);
                             }}
                             disabled={isLoading}
                             className={`w-full text-left p-2 rounded-lg transition-all duration-200 overflow-hidden ${
                               selectedClassId === danceClass.id.toString()
                                 ? "bg-yellow-600/20 border-2 border-yellow-500/50 text-yellow-100"
                                 : "bg-gray-600/50 hover:bg-gray-600 text-white border border-transparent"
                             }`}
                           >
                             <div className="flex flex-col space-y-1 min-w-0 w-full">
                               <span className="font-medium text-sm truncate w-full" title={danceClass.name}>
                                 {danceClass.name.split(' - ')[0]}
                               </span>
                               <div className="flex items-center gap-2 w-full">
                                 <span className="text-xs text-gray-400 truncate flex-1 min-w-0" title={danceClass.trainer.name}>
                                   {danceClass.trainer.name}
                                 </span>
                                 <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded flex-shrink-0">
                                   {displayLevel}
                                 </span>
                               </div>
                             </div>
                           </button>
                        );
                      })}
                      
                      {hasMoreClasses && (
                        <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-600">
                          {searchTerm.trim() 
                            ? "Usa términos más específicos para ver más resultados"
                            : "Busca por nombre o profesor para ver más clases"
                          }
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Información de la clase seleccionada */}
            {selectedClass && (() => {
              // Mapear niveles para mostrar texto más amigable
              const levelMap: { [key: string]: string } = {
                'BEGINNER': 'Principiante',
                'INTERMEDIATE': 'Intermedio',
                'ADVANCED': 'Avanzado'
              };
              
              const displayLevel = levelMap[selectedClass.level] || selectedClass.level;
              
              return (
                <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <span className="font-medium text-yellow-400 text-sm truncate flex-1" title={selectedClass.name}>
                      {selectedClass.name.split(' - ')[0]}
                    </span>
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded flex-shrink-0">
                      VB
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-300 truncate flex-1" title={selectedClass.trainer.name}>
                      {selectedClass.trainer.name}
                    </span>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded flex-shrink-0">
                      {displayLevel}
                    </span>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="details" className="space-y-3 py-3">
            {/* Fecha del Partido */}
            <div className="space-y-2">
              <Label htmlFor="match-date" className="text-sm font-medium">
                Fecha del Partido *
              </Label>
              <div className="relative">
                <Input
                  id="match-date"
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-700 border-gray-600 text-white"
                  min={new Date().toISOString().split('T')[0]}
                />
                <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Notas Adicionales */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notas Adicionales
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading}
                placeholder="Información adicional sobre el partido (opcional)"
                className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-400">
                {notes.length}/500 caracteres
              </p>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-3 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Asistencia de Estudiantes ({classStudents.length})
              </Label>
              <div className="max-h-48 overflow-y-auto bg-gray-700/50 rounded-lg border border-gray-600 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
                {classStudents.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    Selecciona una clase para ver los estudiantes
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {classStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-2 bg-gray-600/30 rounded-lg gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm font-medium text-white truncate" title={student.name}>
                            {student.name}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setStudentAttendances(prev => ({...prev, [student.id]: "PRESENT"}))}
                            className={`p-1 rounded ${
                              studentAttendances[student.id] === "PRESENT" 
                                ? "bg-green-600 text-white" 
                                : "bg-gray-500 text-gray-300 hover:bg-green-500"
                            }`}
                            title="Presente"
                          >
                            <CheckIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setStudentAttendances(prev => ({...prev, [student.id]: "ABSENT"}))}
                            className={`p-1 rounded ${
                              studentAttendances[student.id] === "ABSENT" 
                                ? "bg-red-600 text-white" 
                                : "bg-gray-500 text-gray-300 hover:bg-red-500"
                            }`}
                            title="Ausente"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setStudentAttendances(prev => ({...prev, [student.id]: "LATE"}))}
                            className={`p-1 rounded ${
                              studentAttendances[student.id] === "LATE" 
                                ? "bg-yellow-600 text-white" 
                                : "bg-gray-500 text-gray-300 hover:bg-yellow-500"
                            }`}
                            title="Tarde"
                          >
                            <ClockIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancelar
          </Button>
          
          {activeTab !== "class" && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Anterior
            </Button>
          )}
          
          {activeTab === "attendance" ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <TrophyIcon className="h-4 w-4 mr-2" />
                  Registrar Partido
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Siguiente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
