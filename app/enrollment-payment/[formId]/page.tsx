'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileImage, CheckCircle, AlertCircle, DollarSign, User, Calendar, Image as ImageIcon, X as XIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface EnrollmentPaymentFormData {
  id: string;
  studentName: string;
  sport: 'DANCE' | 'VOLLEYBALL';
  amount: number;
  status: string;
  expiresAt: string;
  paymentProofs: Array<{
    id: number;
    status: string;
    uploadedAt: string;
    reviewNotes?: string;
  }>;
}

export default function EnrollmentPaymentPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [formData, setFormData] = useState<EnrollmentPaymentFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Formulario de pago simplificado
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (formId) {
      loadFormData();
    }
  }, [formId]);

  // Limpiar preview URL cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/enrollment-payment/${formId}`);
      const data = await response.json();

      if (data.success) {
        setFormData(data.form);
      } else {
        setError(data.message || 'Error al cargar el formulario');
      }
    } catch (err) {
      setError('Error de conexión al cargar el formulario');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setProofFile(file);
      // Crear preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proofFile) {
      setError('Debe subir un comprobante de pago');
      return;
    }

    setSubmitting(true);
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

      // Crear comprobante de pago simplificado
      const proofData = {
        payerName: formData?.studentName || '',
        payerPhone: '',
        payerEmail: '',
        amount: formData?.amount || 0,
        paymentMethod: 'TRANSFER' as const,
        proofImageUrl: uploadResult.url
      };

      const response = await fetch(`/api/enrollment-payment/${formId}/upload-proof`, {
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
      loadFormData(); // Recargar para ver el estado actualizado
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando formulario de pago...</p>
        </div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-500 bg-red-900/20">
          <CardContent className="pt-6">
            <Alert className="border-red-500 bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md border-gray-600 bg-gray-800/90">
          <CardContent className="pt-6">
            <Alert className="border-gray-500 bg-gray-700/20">
              <AlertDescription className="text-gray-400">
                Formulario no encontrado
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProof = formData.paymentProofs.length > 0;
  const latestProof = formData.paymentProofs[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Pago de Inscripción
            </h1>
            <p className="text-gray-400">
              Paradise Dance Academy
            </p>
          </div>

          {/* Información del estudiante */}
          <Card className="border-gray-600 bg-gray-800/90">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Estudiante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Nombre</Label>
                  <p className="text-white font-medium">{formData.studentName}</p>
                </div>
                <div>
                  <Label className="text-gray-300">Deporte</Label>
                  <Badge className="mt-1">
                    {formData.sport === 'DANCE' ? 'Baile' : 'Voleibol'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Monto de Inscripción</Label>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(formData.amount)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Estado del pago */}
          {hasProof && (
            <Card className="border-gray-600 bg-gray-800/90">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Estado del Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={latestProof.status === 'APPROVED' ? 'default' : 
                              latestProof.status === 'REJECTED' ? 'destructive' : 'secondary'}
                    >
                      {latestProof.status === 'APPROVED' ? 'Aprobado' :
                       latestProof.status === 'REJECTED' ? 'Rechazado' : 'En Revisión'}
                    </Badge>
                    <span className="text-gray-400 text-sm">
                      {new Date(latestProof.uploadedAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  {latestProof.reviewNotes && (
                    <div>
                      <Label className="text-gray-300">Notas de revisión</Label>
                      <p className="text-white mt-1">{latestProof.reviewNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulario de pago simplificado */}
          {!hasProof && !success && (
            <Card className="border-gray-600 bg-gray-800/90">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Subir Comprobante de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Comprobante de pago</Label>
                    
                    {/* Caja de drag & drop */}
                    <div
                      className={`mt-2 relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                        dragActive 
                          ? 'border-blue-400 bg-blue-500/10' 
                          : previewUrl 
                            ? 'border-green-400 bg-green-500/10' 
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      
                      {previewUrl ? (
                        <div className="text-center">
                          <div className="relative inline-block">
                            <img 
                              src={previewUrl} 
                              alt="Preview" 
                              className="max-w-full h-32 object-contain rounded-lg mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setProofFile(null);
                                setPreviewUrl(null);
                                URL.revokeObjectURL(previewUrl);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-green-400 text-sm mt-2 font-medium">
                            ✅ Imagen seleccionada: {proofFile?.name}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="mx-auto w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-300 font-medium mb-2">
                            {dragActive ? 'Suelta aquí tu imagen' : 'Arrastra y suelta tu imagen aquí'}
                          </p>
                          <p className="text-gray-400 text-sm mb-4">
                            O haz clic para seleccionar una imagen
                          </p>
                          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                            <Upload className="h-4 w-4" />
                            <span>JPG, PNG, GIF hasta 5MB</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-gray-400 text-sm mt-2">
                      Sube una foto clara del comprobante de pago de $20,000
                    </p>
                  </div>

                  {error && (
                    <Alert className="border-red-500 bg-red-900/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-400">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Comprobante
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <Card className="border-green-500 bg-green-900/20">
              <CardContent className="pt-6">
                <Alert className="border-green-500 bg-green-900/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-400">
                    ¡Comprobante enviado exitosamente! Recibirás una confirmación en las próximas 24 horas.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 