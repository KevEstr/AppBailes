import { NextRequest, NextResponse } from 'next/server';
import { enrollmentPaymentService } from '@/lib/enrollment-payment-service';

// POST /api/enrollment-payment/[formId]/upload-proof - Subir comprobante de pago de inscripción
export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const { formId } = params;
    const body = await request.json();

    if (!formId) {
      return NextResponse.json(
        { message: 'ID del formulario es requerido' },
        { status: 400 }
      );
    }

    // Validar datos requeridos
    const { payerName, amount, paymentMethod, proofImageUrl } = body;

    if (!payerName || !amount || !paymentMethod || !proofImageUrl) {
      return NextResponse.json(
        { message: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Validar método de pago
    const validPaymentMethods = ['CASH', 'TRANSFER', 'CARD'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { message: 'Método de pago inválido' },
        { status: 400 }
      );
    }

    // Validar monto
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { message: 'Monto inválido' },
        { status: 400 }
      );
    }

    const proofData = {
      payerName,
      payerPhone: body.payerPhone,
      payerEmail: body.payerEmail,
      amount: numericAmount,
      paymentMethod: paymentMethod as 'CASH' | 'TRANSFER' | 'CARD',
      proofImageUrl
    };

    const proof = await enrollmentPaymentService.uploadEnrollmentPaymentProof(formId, proofData);

    return NextResponse.json({
      success: true,
      message: 'Comprobante subido exitosamente',
      proof: {
        id: proof.id,
        status: proof.status,
        uploadedAt: proof.uploadedAt
      }
    });

  } catch (error) {
    console.error('Error subiendo comprobante de inscripción:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Formulario no encontrado') {
        return NextResponse.json(
          { message: 'Formulario no encontrado' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Formulario no está disponible para recibir comprobantes') {
        return NextResponse.json(
          { message: 'Formulario no está disponible' },
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