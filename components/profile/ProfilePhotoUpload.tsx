'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle, Camera, Info } from 'lucide-react';
import Image from 'next/image';

const UPLOAD_TIMEOUT_MS = 60000; // 60 segundos

/** Clasifica el error para mostrar un mensaje claro al usuario (red vs servidor vs otro). */
function getUploadErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return 'La subida tardó demasiado. Revisa tu conexión a internet e intenta de nuevo.';
    }
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return 'No hay conexión a internet o el servidor no responde. Revisa tu red e intenta de nuevo.';
    }
    if (err.message.includes('JSON')) {
      return 'El servidor respondió con un error inesperado. Intenta de nuevo en unos momentos.';
    }
    return err.message;
  }
  return 'Error desconocido al subir la foto. Intenta de nuevo.';
}

interface ProfilePhotoUploadProps {
  studentId?: string;
  currentPhotoUrl?: string;
  onSuccess?: (newPhotoUrl: string) => void;
  onError?: (message: string) => void;
  uploadOnly?: boolean;
}

export function ProfilePhotoUpload({ 
  studentId, 
  currentPhotoUrl, 
  onSuccess,
  onError,
  uploadOnly
}: ProfilePhotoUploadProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatos habituales: iPhone (HEIC), Huawei/Android (JPEG, PNG, WebP), etc.
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/x-heic'
  ];

  const isHeicOrHeif = (type: string) =>
    ['image/heic', 'image/heif', 'image/x-heic'].includes(type);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError('Formato no admitido. Usa JPG, PNG, WebP o HEIC (iPhone).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    // HEIC/HEIF: muchos navegadores no pueden previsualizar ni leer dimensiones; aceptar sin comprobar tamaño
    if (isHeicOrHeif(file.type)) {
      setPhotoFile(file);
      setError(null);
      setSuccess(false);
      setPreviewUrl(null);
      return;
    }

    const img = document.createElement('img');
    img.onload = () => {
      if (img.width < 200 || img.height < 200) {
        setError('La imagen debe tener al menos 200x200 píxeles');
        return;
      }
      setPhotoFile(file);
      setError(null);
      setSuccess(false);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    };
    img.onerror = () => {
      setError('Error al procesar la imagen');
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!photoFile) {
      setError('Debe seleccionar una foto');
      return;
    }

    // Validar conexión antes de intentar subir
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const msg = 'No hay conexión a internet. Conéctate y vuelve a intentar subir la foto.';
      setError(msg);
      onError?.(msg);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      // Subir imagen
      const uploadFormData = new FormData();
      uploadFormData.append('photo', photoFile);
      if (studentId) {
        uploadFormData.append('studentId', studentId);
      }
      
      const uploadResponse = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        body: uploadFormData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        let message = 'Error al subir la foto';
        try {
          const errorData = await uploadResponse.json();
          message = errorData.message || message;
        } catch {
          if (uploadResponse.status >= 500) {
            message = 'El servidor no está disponible. Intenta de nuevo en unos minutos.';
          } else if (uploadResponse.status === 408 || uploadResponse.status === 504) {
            message = 'La subida tardó demasiado. Revisa tu conexión e intenta de nuevo.';
          }
        }
        throw new Error(message);
      }

      let uploadResult: { url?: string };
      try {
        uploadResult = await uploadResponse.json();
      } catch {
        throw new Error('El servidor respondió con un formato inesperado. Intenta de nuevo.');
      }

      if (!uploadResult?.url) {
        throw new Error('El servidor no devolvió la URL de la foto. Intenta de nuevo.');
      }

      // Si estamos en modo pre-inscripción o no hay studentId, retornar solo la URL
      if (!studentId || uploadOnly) {
        setSuccess(true);
        onSuccess?.(uploadResult.url);
      } else {
        // Actualizar foto de perfil del estudiante
        const updateResponse = await fetch(`/api/students/${studentId}/photo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            photoUrl: uploadResult.url
          })
        });

        if (!updateResponse.ok) {
          let msg = 'Error al actualizar la foto de perfil';
          try {
            const errorData = await updateResponse.json();
            msg = errorData.message || msg;
          } catch {
            if (updateResponse.status >= 500) {
              msg = 'El servidor no está disponible. Intenta de nuevo en unos minutos.';
            }
          }
          throw new Error(msg);
        }

        setSuccess(true);
        onSuccess?.(uploadResult.url);
      }
      
      // Limpiar formulario después de 2 segundos y redirigir
      setTimeout(() => {
        setPhotoFile(null);
        setPreviewUrl(null);
        setSuccess(false);
        // La redirección se maneja en el componente padre
      }, 2000);

    } catch (err) {
      const message = getUploadErrorMessage(err);
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {studentId ? 'Cambiar Foto de Perfil' : 'Subir Foto de Perfil'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Guía de fotografía */}
          <Card className="bg-blue-950/30 border-blue-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-400 flex items-center gap-2 text-lg">
                <Info className="w-4 h-4" />
                Guía para la Foto de Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Foto del pecho para arriba (tipo documento)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Fondo blanco o de color claro</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Sin gafas de sol (gafas normales sí están permitidas)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Rostro completamente visible y bien iluminado</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Formato JPG, PNG, WebP o HEIC (iPhone), máximo 5MB</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Resolución mínima: 200x200 píxeles</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Foto actual */}
          {currentPhotoUrl && (
            <div className="text-center">
              <Label className="text-slate-300 text-sm font-medium">Foto Actual</Label>
              <div className="mt-2 flex justify-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-600">
                  <Image
                    src={currentPhotoUrl}
                    alt="Foto actual"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de archivo */}
            <div className="space-y-2">
              <Label htmlFor="photo" className="text-slate-300">
                Nueva Foto de Perfil
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/x-heic"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar Foto
                </Button>
                {photoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemovePhoto}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    Quitar
                  </Button>
                )}
              </div>
              {photoFile && (
                <p className="text-sm text-slate-400">
                  Archivo seleccionado: {photoFile.name} 
                  <span className="text-slate-500">
                    ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </p>
              )}
            </div>

            {/* Preview de la imagen */}
            {previewUrl && (
              <div className="text-center">
                <Label className="text-slate-300 text-sm font-medium">Vista Previa</Label>
                <div className="mt-2 flex justify-center">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-blue-500">
                    <Image
                      src={previewUrl}
                      alt="Vista previa"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mensajes de estado */}
            {error && (
              <Alert className="border-red-600 bg-red-950/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-600 bg-green-950/30">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  ¡Foto de perfil actualizada exitosamente! Redirigiendo a tu perfil...
                </AlertDescription>
              </Alert>
            )}

            {/* Botón de envío */}
            <Button
              type="submit"
              disabled={!photoFile || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Subiendo...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  {studentId ? 'Actualizar Foto de Perfil' : 'Subir Foto de Perfil'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
