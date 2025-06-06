import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// PUT /api/admin/payment-proofs/[proofId]/review - Revisar comprobante
export async function PUT(
  request: NextRequest,
  { params }: { params: { proofId: string } }
) {
  try {
    const proofId = parseInt(params.proofId);
    const body = await request.json();
    
    if (isNaN(proofId)) {
      return NextResponse.json(
        { message: 'ID de comprobante inválido' },
        { status: 400 }
      );
    }

    const { status, reviewedBy, reviewNotes, approvedAmount } = body;

    // Validaciones
    if (!status || !['APPROVED', 'REJECTED', 'NEEDS_REVIEW'].includes(status)) {
      return NextResponse.json(
        { message: 'Estado de revisión inválido' },
        { status: 400 }
      );
    }

    if (!reviewedBy) {
      return NextResponse.json(
        { message: 'Revisor es obligatorio' },
        { status: 400 }
      );
    }

    const reviewedProof = await monthlyPaymentService.reviewPaymentProof(proofId, {
      status,
      reviewedBy,
      reviewNotes,
      approvedAmount: approvedAmount ? parseFloat(approvedAmount) : undefined
    });

    return NextResponse.json(reviewedProof);
  } catch (error) {
    console.error('Error al revisar comprobante:', error);
    
    if (error instanceof Error && error.message === 'Comprobante no encontrado') {
      return NextResponse.json(
        { message: 'Comprobante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 