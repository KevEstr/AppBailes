import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { paymentId: paymentIdParam } = params;
    const paymentId = parseInt(paymentIdParam);
    
    if (isNaN(paymentId)) {
      return NextResponse.json(
        { message: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    const { paymentMethod, receivedAmount, additionalDebt, discount, notes } = await request.json();

    if (!paymentMethod) {
      return NextResponse.json(
        { message: 'Método de pago es requerido' },
        { status: 400 }
      );
    }

    const updatedPayment = await monthlyPaymentService.markPaymentAsReceived(paymentId, {
      paymentMethod,
      receivedAmount,
      additionalDebt,
      discount,
      markedBy: session.user.id,
      notes
    });

    return NextResponse.json({
      success: true,
      message: 'Pago marcado como recibido exitosamente',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Error marcando pago como recibido:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Pago no encontrado') {
        return NextResponse.json(
          { message: 'Pago no encontrado' },
          { status: 404 }
        );
      }
      
      if (error.message === 'El pago ya ha sido marcado como recibido') {
        return NextResponse.json(
          { message: 'El pago ya ha sido marcado como recibido' },
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
