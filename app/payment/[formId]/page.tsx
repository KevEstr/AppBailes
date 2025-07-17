"use client";

import { useState, useEffect, use } from "react";
import { PaymentForm } from "@/components/monthly-payments/PaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface PaymentFormData {
  id: string;
  studentName: string;
  amount: number;
  status: string;
  period: {
    name: string;
    dueDate: Date;
  };
  paymentProofs: Array<{
    id: number;
    status: string;
    uploadedAt: Date;
    reviewNotes?: string;
  }>;
}

interface PageProps {
  params: Promise<{
    formId: string;
  }>;
}

export default function PaymentFormPage({ params }: PageProps) {
  const { formId } = use(params);
  const [formData, setFormData] = useState<PaymentFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFormData();
  }, [formId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payment-form/${formId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Formulario de pago no encontrado");
        } else if (response.status === 410) {
          setError("Este formulario de pago ha expirado");
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Error al cargar formulario");
        }
        return;
      }

      const data = await response.json();
      setFormData(data);
    } catch (err) {
      console.error("Error al cargar el formulario de pago:", err);
      setError("Error de conexión. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Cargando formulario de pago...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Si crees que esto es un error, contacta a la academia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No se pudo cargar el formulario.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentForm formData={formData} />
    </div>
  );
}
