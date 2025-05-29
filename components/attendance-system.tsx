"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: string
  name: string
  avatar: string
  group: string
  hasDebt: boolean
  status?: "present" | "late" | "absent" | "change_request"
}

export function AttendanceSystem() {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isTrainerMode, setIsTrainerMode] = useState(false)

  useEffect(() => {
    const loadStudents = async () => {
      const response = await fetch("/api/students")
      const data = await response.json()
      setStudents(data.students)
    }
    loadStudents()

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const markAttendance = async (studentId: string, status: string) => {
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status, timestamp: new Date() }),
      })

      const result = await response.json()

      if (result.success) {
        setStudents((prev) =>
          prev.map((student) => (student.id === studentId ? { ...student, status: status as any } : student)),
        )

        const statusMessages = {
          present: "✅ Presente",
          late: "⏰ Llegada Tarde",
          absent: "❌ Ausente",
          change_request: "🔄 Cambio de Grupo",
        }

        toast({
          title: statusMessages[status as keyof typeof statusMessages],
          description: `${students.find((s) => s.id === studentId)?.name}`,
        })

        // Avanzar al siguiente estudiante automáticamente
        if (currentStudentIndex < students.length - 1) {
          setCurrentStudentIndex(currentStudentIndex + 1)
        }
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo registrar",
        variant: "destructive",
      })
    }
  }

  const nextStudent = () => {
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1)
    }
  }

  const prevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1)
    }
  }

  const currentStudent = students[currentStudentIndex]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-2xl mb-8 rounded-3xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                <Zap className="h-8 w-8" />
              </div>
              <div>
                <span className="text-3xl font-bold">Asistencia TikTok</span>
                <p className="text-purple-200 mt-2">Desliza para marcar asistencia</p>
              </div>
            </div>
            <div className="text-right text-lg">
              <div className="text-white font-mono text-2xl">{currentTime.toLocaleTimeString()}</div>
              <div className="text-purple-200">{currentTime.toLocaleDateString()}</div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Selector de Modo */}
      <Card className="border-0 shadow-xl mb-8 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex space-x-3">
            <Button
              variant={!isTrainerMode ? "default" : "outline"}
              onClick={() => setIsTrainerMode(false)}
              className={`flex-1 h-14 rounded-2xl transition-all duration-500 text-lg font-semibold ${
                !isTrainerMode
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl"
                  : "border-2 border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Estudiantes
            </Button>
            <Button
              variant={isTrainerMode ? "default" : "outline"}
              onClick={() => setIsTrainerMode(true)}
              className={`flex-1 h-14 rounded-2xl transition-all duration-500 text-lg font-semibold ${
                isTrainerMode
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl"
                  : "border-2 border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckCircle className="w-5 h-5 mr-3" />
              Entrenador
            </Button>
          </div>
        </CardContent>
      </Card>

      {isTrainerMode ? (
        /* Modo Entrenador */
        <Card className="border-0 shadow-2xl rounded-3xl">
          <CardContent className="p-12 text-center space-y-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
              <Users className="w-16 h-16 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 mb-4">Registro de Entrenador</h3>
              <p className="text-slate-600 text-lg">Marca tu asistencia como entrenador</p>
            </div>
            <div className="flex justify-center space-x-6">
              <Button
                onClick={() => markAttendance("trainer", "present")}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 h-16 px-8 rounded-2xl shadow-xl text-lg font-semibold"
              >
                <CheckCircle className="w-6 h-6 mr-3" />
                Llegada a Tiempo
              </Button>
              <Button
                onClick={() => markAttendance("trainer", "late")}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-16 px-8 rounded-2xl shadow-xl text-white text-lg font-semibold"
              >
                <Clock className="w-6 h-6 mr-3" />
                Llegada Tarde
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Modo TikTok - Un estudiante a la vez */
        <div className="space-y-6">
          {currentStudent && (
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                {/* Imagen grande del estudiante */}
                <div className="relative h-96 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Avatar className="w-64 h-64 ring-8 ring-white shadow-2xl">
                    <AvatarImage src={currentStudent.avatar || "/placeholder.svg"} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-6xl font-bold">
                      {currentStudent.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Navegación */}
                  <Button
                    variant="ghost"
                    onClick={prevStudent}
                    disabled={currentStudentIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={nextStudent}
                    disabled={currentStudentIndex === students.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>

                  {/* Contador */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                    <span className="font-mono text-lg">
                      {currentStudentIndex + 1} / {students.length}
                    </span>
                  </div>
                </div>

                {/* Información del estudiante */}
                <div className="p-8 bg-white">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{currentStudent.name}</h2>
                    <p className="text-xl text-slate-600 mb-3">{currentStudent.group}</p>
                    {currentStudent.hasDebt && (
                      <div className="flex items-center justify-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <Badge variant="destructive" className="text-sm">
                          Tiene deuda pendiente
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Botones de asistencia */}
                  {currentStudent.status ? (
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-3 bg-slate-100 px-6 py-3 rounded-2xl">
                        {currentStudent.status === "present" && <CheckCircle className="w-6 h-6 text-green-500" />}
                        {currentStudent.status === "late" && <Clock className="w-6 h-6 text-amber-500" />}
                        {currentStudent.status === "absent" && <XCircle className="w-6 h-6 text-red-500" />}
                        {currentStudent.status === "change_request" && <RotateCcw className="w-6 h-6 text-blue-500" />}
                        <span className="text-lg font-semibold text-slate-700">
                          {currentStudent.status === "present" && "Presente"}
                          {currentStudent.status === "late" && "Llegó Tarde"}
                          {currentStudent.status === "absent" && "Ausente"}
                          {currentStudent.status === "change_request" && "Cambio de Grupo"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => markAttendance(currentStudent.id, "present")}
                        className="h-16 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-2xl shadow-xl text-lg font-semibold"
                      >
                        <CheckCircle className="w-6 h-6 mr-3" />
                        Presente
                      </Button>
                      <Button
                        onClick={() => markAttendance(currentStudent.id, "late")}
                        className="h-16 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl shadow-xl text-white text-lg font-semibold"
                      >
                        <Clock className="w-6 h-6 mr-3" />
                        Tarde
                      </Button>
                      <Button
                        onClick={() => markAttendance(currentStudent.id, "absent")}
                        className="h-16 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-2xl shadow-xl text-lg font-semibold"
                      >
                        <XCircle className="w-6 h-6 mr-3" />
                        Ausente
                      </Button>
                      <Button
                        onClick={() => markAttendance(currentStudent.id, "change_request")}
                        className="h-16 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl shadow-xl text-lg font-semibold"
                      >
                        <RotateCcw className="w-6 h-6 mr-3" />
                        Cambio
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progreso */}
          <Card className="border-0 shadow-xl rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-slate-700">Progreso de Asistencia</span>
                <span className="text-sm text-slate-500">
                  {students.filter((s) => s.status).length} de {students.length} completados
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(students.filter((s) => s.status).length / students.length) * 100}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
