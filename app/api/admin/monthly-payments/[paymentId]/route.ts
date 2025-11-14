import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

// DELETE /api/admin/monthly-payments/[paymentId] - Eliminar un pago mensual
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { paymentId: paymentIdParam } = await params;
    const paymentId = Number.parseInt(paymentIdParam);
    
    if (Number.isNaN(paymentId)) {
      return NextResponse.json(
        { message: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    // Verificar que el pago existe y obtener sus relaciones
    const payment = await prisma.monthlyPayment.findUnique({
      where: { id: paymentId },
      include: {
        student: {
          select: {
            name: true
          }
        },
        danceClass: {
          select: {
            name: true
          }
        },
        receipts: {
          select: {
            id: true
          }
        },
        paymentForms: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json(
        { message: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Solo permitir eliminar pagos pendientes o vencidos
    // No permitir eliminar pagos que ya han sido pagados
    if (payment.status === 'PAID' || payment.status === 'PARTIAL_PAID') {
      return NextResponse.json(
        { message: 'No se puede eliminar un pago que ya ha sido pagado' },
        { status: 400 }
      );
    }

    // Verificar relaciones antes de eliminar
    const hasReceipts = payment.receipts.length > 0;
    const hasPaymentForms = payment.paymentForms.length > 0;
    const activePaymentForms = payment.paymentForms.filter(pf => pf.status === 'ACTIVE').length;

    // Si hay recibos asociados, prevenir la eliminación
    // Los recibos son registros importantes de transacciones
    if (hasReceipts) {
      return NextResponse.json(
        { 
          message: 'No se puede eliminar un pago que tiene recibos asociados',
          details: `Este pago tiene ${payment.receipts.length} recibo(s) asociado(s). Los recibos son registros importantes de transacciones y no pueden ser eliminados.`
        },
        { status: 400 }
      );
    }

    // Advertir sobre formularios de pago (pero permitir eliminación)
    // Los formularios de pago se eliminarán en cascada
    if (hasPaymentForms) {
      // Eliminar el pago (los formularios se eliminarán en cascada automáticamente)
      await prisma.monthlyPayment.delete({
        where: { id: paymentId }
      });

      return NextResponse.json({
        success: true,
        message: 'Pago eliminado exitosamente',
        warning: activePaymentForms > 0 
          ? `Se eliminaron ${payment.paymentForms.length} formulario(s) de pago asociado(s), incluyendo ${activePaymentForms} activo(s).`
          : `Se eliminaron ${payment.paymentForms.length} formulario(s) de pago asociado(s).`
      });
    }

    // Eliminar el pago (sin relaciones)
    await prisma.monthlyPayment.delete({
      where: { id: paymentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando pago:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

