import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/payment-form/[formId] - Obtener formulario de pago
export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const { formId } = params;

    if (!formId) {
      return NextResponse.json(
        { message: 'ID de formulario requerido' },
        { status: 400 }
      );
    }

    const paymentForm = await monthlyPaymentService.getPaymentForm(formId);
    
    return NextResponse.json(paymentForm);
  } catch (error) {
    console.error('Error al obtener formulario de pago:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Formulario no encontrado') {
        return NextResponse.json(
          { message: 'Formulario de pago no encontrado' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Formulario expirado') {
        return NextResponse.json(
          { message: 'Este formulario de pago ha expirado' },
          { status: 410 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 