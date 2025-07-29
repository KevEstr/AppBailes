import { NextRequest, NextResponse } from 'next/server';
import { enrollmentPaymentService } from '@/lib/enrollment-payment-service';

// GET /api/enrollment-payment/[formId] - Obtener información del formulario de pago de inscripción
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    if (!formId) {
      return NextResponse.json(
        { message: 'ID del formulario es requerido' },
        { status: 400 }
      );
    }

    const form = await enrollmentPaymentService.getEnrollmentPaymentForm(formId);

    if (!form) {
      return NextResponse.json(
        { message: 'Formulario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el formulario está activo
    if (form.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Formulario no está disponible' },
        { status: 400 }
      );
    }

    // Verificar si ha expirado
    if (form.expiresAt && new Date() > form.expiresAt) {
      return NextResponse.json(
        { message: 'Formulario ha expirado' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        studentName: form.studentName,
        sport: form.sport,
        amount: form.amount,
        status: form.status,
        expiresAt: form.expiresAt,
        paymentProofs: form.paymentProofs
      }
    });

  } catch (error) {
    console.error('Error obteniendo formulario de pago de inscripción:', error);
    
    if (error instanceof Error && error.message === 'Formulario de pago no encontrado') {
      return NextResponse.json(
        { message: 'Formulario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 