import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// POST /api/payment-form/[formId]/upload-proof - Subir comprobante de pago
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await request.json();

    const { 
      payerName, 
      payerPhone, 
      payerEmail, 
      amount, 
      paymentMethod, 
      proofImageUrl 
    } = body;

    // Validaciones
    if (!payerName?.trim()) {
      return NextResponse.json(
        { message: 'El nombre del pagador es obligatorio' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { message: 'El monto debe ser un número positivo' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !['CASH', 'TRANSFER', 'CARD'].includes(paymentMethod)) {
      return NextResponse.json(
        { message: 'Método de pago inválido' },
        { status: 400 }
      );
    }

    if (!proofImageUrl?.trim()) {
      return NextResponse.json(
        { message: 'La imagen del comprobante es obligatoria' },
        { status: 400 }
      );
    }

    const paymentProof = await monthlyPaymentService.uploadPaymentProof(formId, {
      payerName: payerName.trim(),
      payerPhone: payerPhone?.trim(),
      payerEmail: payerEmail?.trim(),
      amount,
      paymentMethod,
      proofImageUrl: proofImageUrl.trim()
    });

    return NextResponse.json(paymentProof, { status: 201 });
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('no está disponible') || 
          error.message.includes('expirado')) {
        return NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 