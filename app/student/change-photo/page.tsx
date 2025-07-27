"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, AlertCircle } from "lucide-react";

interface StudentData {
  id: string;
  name: string;
  avatar?: string;
}

export default function ChangeProfilePhotoPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    loadStudentData();
  }, [session, status, router]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/students/profile");

      if (!response.ok) {
        throw new Error("Error al cargar datos del estudiante");
      }

      const data = await response.json();
      setStudent(data.student);
    } catch (err) {
      console.error("Error al cargar estudiante:", err);
      setError("Error al cargar los datos del estudiante");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSuccess = (newPhotoUrl: string) => {
    setStudent(prev => prev ? { ...prev, avatar: newPhotoUrl } : null);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">
            Cargando datos del estudiante...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-300 mb-4">{error}</p>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300">
              No se encontraron datos del estudiante.
            </p>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Cambiar Foto de Perfil
            </h1>
            <p className="text-slate-300">
              Actualiza tu foto de perfil para {student.name}
            </p>
          </div>
        </div>

        {/* Componente de subida de foto */}
        <ProfilePhotoUpload
          studentId={student.id}
          currentPhotoUrl={student.avatar}
          onSuccess={handlePhotoSuccess}
        />
      </div>
    </div>
  );
}
