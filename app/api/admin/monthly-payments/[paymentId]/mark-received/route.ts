import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { DigitalReceiptService } from '@/lib/digital-receipt-service';
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';

export async function POST(
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

    const { paymentMethod, receivedAmount, additionalDebt, discount, additionalPayment } = await request.json();

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
      additionalPayment
    });

    // Buscar el recibo más reciente generado para este pago
    let receiptId = null;
    let receiptUrl = null;
    let nextPaymentDate = null;
    let periodName = null;
    
    try {
      const receipt = await prisma.receipt.findFirst({
        where: {
          monthlyPaymentId: paymentId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (receipt) {
        receiptId = receipt.id;
        receiptUrl = DigitalReceiptService.generateReceiptUrl(receipt.id);
      }

      // Obtener información del pago para calcular fecha del próximo pago y período
      const payment = await prisma.monthlyPayment.findUnique({
        where: { id: paymentId },
        include: {
          period: true,
          student: {
            include: {
              classEnrollments: {
                where: { isActive: true },
                include: {
                  danceClass: {
                    select: { id: true, sport: true }
                  }
                }
              }
            }
          }
        }
      });

      if (payment && payment.period) {
        // Obtener el día de corte de la clase específica (15 o 30)
        let cutoffDay = 30; // Default
        if (payment.classId) {
          const enrollment = await prisma.classEnrollment.findFirst({
            where: {
              studentId: payment.studentId,
              classId: payment.classId,
              isActive: true
            },
            select: { paymentCutoffDay: true }
          });
          cutoffDay = enrollment?.paymentCutoffDay || 30;
        }

        // Calcular el período correcto para el concepto basado en el día de corte
        const periodInfo = calculatePaymentPeriodForConcept(
          cutoffDay,
          payment.period.year,
          payment.period.month
        );
        periodName = periodInfo.periodName;

        // Calcular fecha del próximo pago
        const currentDate = new Date(payment.period.year, payment.period.month - 1, 1);
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Buscar si ya existe un período para el próximo mes
        const nextPeriod = await prisma.paymentPeriod.findFirst({
          where: {
            year: nextMonth.getFullYear(),
            month: nextMonth.getMonth() + 1,
            isActive: true,
          },
        });

        if (nextPeriod) {
          const nextPaymentDateObj = new Date(nextPeriod.year, nextPeriod.month - 1, cutoffDay);
          nextPaymentDate = nextPaymentDateObj.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } else {
          const nextPaymentDateObj = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), cutoffDay);
          nextPaymentDate = nextPaymentDateObj.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    } catch (receiptError) {
      console.error('Error buscando recibo o calculando fechas:', receiptError);
      // Continuar sin recibo
    }

    return NextResponse.json({
      success: true,
      message: 'Pago marcado como recibido exitosamente',
      payment: updatedPayment,
      receiptId,
      receiptUrl,
      nextPaymentDate,
      periodName
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
      if (error.message.startsWith('No se puede registrar el adeudo:')) {
        return NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
      if (error.message.startsWith('Error crítico:')) {
        return NextResponse.json(
          { message: error.message },
          { status: 500 }
        );
      }
      if (error.message.startsWith('No hay configuración de mensualidad')) {
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
