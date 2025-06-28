'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentFormProps {
  formData: {
    id: string;
    studentName: string;
    amount: number;
    period: {
      name: string;
      dueDate: Date;
    };
    status: string;
    paymentProofs: Array<{
      id: number;
      status: string;
      uploadedAt: Date;
      reviewNotes?: string;
    }>;
  };
}

export function PaymentForm({ formData }: PaymentFormProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar los 5MB');
      return;
    }

    setProofFile(file);
    setError(null);

    // Crear preview para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proofFile) {
      setError('Debe subir un comprobante de pago');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Subir imagen primero
      const uploadFormData = new FormData();
      uploadFormData.append('proof', proofFile);
      
      const uploadResponse = await fetch('/api/upload/payment-proof', {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir el comprobante');
      }

      const uploadResult = await uploadResponse.json();

      // Crear comprobante de pago
      const proofData = {
        payerName: formData.studentName, // Usar el nombre del estudiante
        amount: formData.amount, // Usar el monto fijo
        paymentMethod: 'TRANSFER', // Método por defecto
        proofImageUrl: uploadResult.url
      };

      const response = await fetch(`/api/payment-form/${formData.id}/upload-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proofData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar el comprobante');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Si ya se subió un comprobante exitosamente
  if (success || formData.status === 'USED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gray-800/90 border-gray-600 shadow-2xl backdrop-blur-sm">
              <CardHeader className="text-center">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <CardTitle className="text-3xl font-bold text-green-400 mb-2">
                  ¡Comprobante Enviado!
                </CardTitle>
                <p className="text-gray-300">
                  Tu comprobante de pago ha sido enviado exitosamente y está siendo revisado por nuestro equipo.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card className="bg-gray-700/50 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white">Detalles del Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Estudiante:</span>
                        <span className="font-semibold text-blue-400">{formData.studentName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Período:</span>
                        <span className="font-medium text-purple-400">{formData.period.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Monto:</span>
                        <span className="font-bold text-2xl text-green-400">{formatCurrency(formData.amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {formData.paymentProofs.length > 0 && (
                  <Card className="bg-gray-700/50 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white">Estado de Revisión</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {formData.paymentProofs.map((proof, index) => (
                          <div key={proof.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                proof.status === 'APPROVED' ? 'bg-green-400' :
                                proof.status === 'REJECTED' ? 'bg-red-400' :
                                'bg-yellow-400'
                              }`}></div>
                              <span className="font-semibold text-white">
                                {proof.status === 'APPROVED' ? 'Pago Aprobado' :
                                 proof.status === 'REJECTED' ? 'Pago Rechazado' :
                                 'En Revisión'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 mb-2">
                              Subido el {new Date(proof.uploadedAt).toLocaleDateString()} a las {new Date(proof.uploadedAt).toLocaleTimeString()}
                            </div>
                            {proof.reviewNotes && (
                              <div className="bg-gray-900/50 p-3 rounded border border-gray-600">
                                <p className="text-sm text-gray-300">
                                  <span className="font-medium text-white">Notas del administrador:</span><br />
                                  {proof.reviewNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    Recibirás una notificación cuando el pago sea procesado completamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Verificar si el formulario está expirado
  if (formData.status === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gray-800/90 border-gray-600 shadow-2xl backdrop-blur-sm">
              <CardHeader className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <CardTitle className="text-2xl text-red-400">
                  Formulario Expirado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-300 mb-4">
                  Este formulario de pago ha expirado. Por favor, contacte a la academia para obtener un nuevo enlace.
                </p>
                <Button 
                  variant="outline" 
                  className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                  onClick={() => window.location.href = '/'}
                >
                  Volver al inicio
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gray-800/90 border-gray-600 shadow-2xl backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Paradise Dance Academy
              </CardTitle>
              <p className="text-xl font-medium text-white mt-2">
                Formulario de Pago
              </p>
              <div className="text-gray-300 mt-4">
                <p className="text-lg">Estudiante: <span className="text-blue-400 font-semibold">{formData.studentName}</span></p>
                <p>Período: <span className="text-purple-400">{formData.period.name}</span></p>
              </div>
            </CardHeader>
        
        <CardContent>

          {error && (
            <Alert className="mb-6 border-red-600 bg-red-900/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resumen del pago */}
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Resumen del Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Estudiante:</span>
                    <span className="font-semibold text-blue-400">{formData.studentName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Período:</span>
                    <span className="font-medium text-purple-400">{formData.period.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Monto a pagar:</span>
                    <span className="font-bold text-2xl text-green-400">{formatCurrency(formData.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Fecha límite:</span>
                    <span className="font-medium text-yellow-400">{new Date(formData.period.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instrucciones */}
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Instrucciones de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-gray-300 space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Realice el pago por el monto exacto indicado arriba</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Tome una fotografía clara del comprobante de pago</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Suba la imagen del comprobante utilizando el formulario</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <span>El pago será revisado y confirmado en un máximo de 24 horas</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Subir comprobante */}
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Comprobante de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-500 rounded-lg p-6 text-center bg-gray-800/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {previewUrl ? (
                  <div className="space-y-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview del comprobante" 
                      className="max-w-full max-h-64 mx-auto rounded-lg border"
                    />
                    <div className="text-sm text-gray-300">
                      {proofFile?.name}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Cambiar imagen
                    </Button>
                  </div>
                ) : proofFile ? (
                  <div className="space-y-4">
                    <FileImage className="h-12 w-12 text-gray-300 mx-auto" />
                    <div className="text-sm text-gray-300">
                      {proofFile.name}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-300 mx-auto" />
                    <div>
                      <p className="text-sm text-gray-300 mb-2">
                        Seleccione una imagen o PDF del comprobante de pago
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Seleccionar archivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
                <p className="text-xs text-gray-400">
                  Formatos permitidos: JPG, PNG, PDF. Tamaño máximo: 5MB
                </p>
              </CardContent>
            </Card>

            {/* Botón de envío */}
            <Card className="bg-gray-700/50 border-gray-600">
              <CardContent className="pt-6">
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-300 text-center">
                    Verifique que la imagen del comprobante sea clara y legible antes de enviar
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3" 
                  disabled={loading || !proofFile}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando comprobante...
                    </>
                  ) : (
                    'Enviar Comprobante'
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 