import { NextRequest, NextResponse } from 'next/server';
import { enrollmentPaymentService } from '@/lib/enrollment-payment-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/admin/enrollment-payment-proofs/[proofId]/review - Revisar comprobante de pago de inscripción
export async function PUT(
  request: NextRequest,
  { params }: { params: { proofId: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { proofId } = params;
    const body = await request.json();

    if (!proofId) {
      return NextResponse.json(
        { message: 'ID del comprobante es requerido' },
        { status: 400 }
      );
    }

    const { status, approvedAmount, reviewNotes } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { message: 'Estado inválido' },
        { status: 400 }
      );
    }

    if (status === 'APPROVED' && (!approvedAmount || approvedAmount <= 0)) {
      return NextResponse.json(
        { message: 'Monto aprobado es requerido para aprobar el pago' },
        { status: 400 }
      );
    }

    const reviewData = {
      status: status as 'APPROVED' | 'REJECTED',
      approvedAmount: status === 'APPROVED' ? Number(approvedAmount) : undefined,
      reviewedBy: session.user.name || session.user.email || 'Admin',
      reviewNotes: reviewNotes || ''
    };

    const result = await enrollmentPaymentService.reviewEnrollmentPaymentProof(
      parseInt(proofId),
      reviewData
    );

    return NextResponse.json({
      success: true,
      message: `Comprobante ${status.toLowerCase()} exitosamente`,
      result
    });

  } catch (error) {
    console.error('Error revisando comprobante de inscripción:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Comprobante no encontrado') {
        return NextResponse.json(
          { message: 'Comprobante no encontrado' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 