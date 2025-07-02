import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { PaymentProofReview } from '@/components/monthly-payments/PaymentProofReview';

// Deshabilitar prerendering para evitar errores con event handlers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Revisión de Comprobantes - Paradise Dance Academy",
  description: "Revisar comprobantes de pago de estudiantes",
}

export default function PaymentProofReviewPage() {
  return (
    <InternalLayout 
      title="Revisión de Comprobantes" 
      description="Revisar comprobantes de pago de estudiantes"
    >
      <PaymentProofReview />
    </InternalLayout>
  );
} 