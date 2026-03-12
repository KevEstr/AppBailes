import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { DigitalReceiptService } from '@/lib/digital-receipt-service';
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';
import { createCorrelationId, logStep, withTimer } from '@/lib/ops-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const correlationId = createCorrelationId(request.headers.get('x-request-id'));
  const t = withTimer();

  try {
    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'start',
      verbose: true,
      data: {
        url: request.url,
        method: 'POST',
      },
    });

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'auth.unauthorized',
        level: 'warn',
        data: { elapsedMs: t.ms() },
      });
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { paymentId: paymentIdParam } = await params;
    const paymentId = Number.parseInt(paymentIdParam);
    
    if (Number.isNaN(paymentId)) {
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'validate.invalid_payment_id',
        level: 'warn',
        data: { paymentIdParam, elapsedMs: t.ms() },
      });
      return NextResponse.json(
        { message: 'ID de pago inválido' },
        { status: 400 }
      );
    }

    const bodyTimer = withTimer();
    const { paymentMethod, receivedAmount, additionalDebt, discount, additionalPayment } = await request.json();
    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'request.body_parsed',
      verbose: true,
      data: {
        paymentId,
        paymentMethod,
        hasReceivedAmount: receivedAmount !== undefined,
        hasAdditionalDebt: additionalDebt !== undefined,
        hasDiscount: discount !== undefined,
        hasAdditionalPayment: additionalPayment !== undefined,
        bodyParseMs: bodyTimer.ms(),
      },
    });

    if (!paymentMethod) {
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'validate.missing_payment_method',
        level: 'warn',
        data: { paymentId, elapsedMs: t.ms() },
      });
      return NextResponse.json(
        { message: 'Método de pago es requerido' },
        { status: 400 }
      );
    }

    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'service.markPaymentAsReceived.call',
      verbose: true,
      data: { paymentId, userId: session.user.id },
    });

    const serviceTimer = withTimer();
    const updatedPayment = await monthlyPaymentService.markPaymentAsReceived(paymentId, {
      paymentMethod,
      receivedAmount,
      additionalDebt,
      discount,
      markedBy: session.user.id,
      additionalPayment,
      correlationId
    });
    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'service.markPaymentAsReceived.done',
      verbose: true,
      data: {
        paymentId,
        serviceMs: serviceTimer.ms(),
        status: (updatedPayment as any)?.status,
      },
    });

    // Buscar el recibo más reciente generado para este pago
    let receiptId = null;
    let receiptUrl = null;
    let nextPaymentDate = null;
    let periodName = null;
    
    try {
      const receiptTimer = withTimer();
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
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'receipt.lookup.done',
        verbose: true,
        data: {
          paymentId,
          receiptId,
          receiptLookupMs: receiptTimer.ms(),
        },
      });

      // Obtener información del pago para calcular fecha del próximo pago y período
      const paymentLookupTimer = withTimer();
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
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'payment.lookup.done',
        verbose: true,
        data: {
          paymentId,
          found: Boolean(payment),
          paymentLookupMs: paymentLookupTimer.ms(),
        },
      });

      if (payment && payment.period) {
        // Obtener el día de corte de la clase específica (15 o 30)
        let cutoffDay = 30; // Default
        if (payment.classId) {
          const cutoffLookupTimer = withTimer();
          const enrollment = await prisma.classEnrollment.findFirst({
            where: {
              studentId: payment.studentId,
              classId: payment.classId,
              isActive: true
            },
            select: { paymentCutoffDay: true }
          });
          cutoffDay = enrollment?.paymentCutoffDay || 30;
          logStep({
            correlationId,
            scope: 'api.mark-received',
            step: 'cutoff.lookup.done',
            verbose: true,
            data: {
              paymentId,
              classId: payment.classId,
              cutoffDay,
              cutoffLookupMs: cutoffLookupTimer.ms(),
            },
          });
        }

        // Calcular el período correcto para el concepto basado en el día de corte
        const periodInfo = calculatePaymentPeriodForConcept(
          cutoffDay,
          payment.period.year,
          payment.period.month
        );
        periodName = periodInfo.periodName;
        logStep({
          correlationId,
          scope: 'api.mark-received',
          step: 'period.calculate.done',
          verbose: true,
          data: {
            paymentId,
            cutoffDay,
            year: payment.period.year,
            month: payment.period.month,
            periodName,
          },
        });

        // Calcular fecha del próximo pago
        const currentDate = new Date(payment.period.year, payment.period.month - 1, 1);
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Buscar si ya existe un período para el próximo mes
        const nextPeriodLookupTimer = withTimer();
        const nextPeriod = await prisma.paymentPeriod.findFirst({
          where: {
            year: nextMonth.getFullYear(),
            month: nextMonth.getMonth() + 1,
            isActive: true,
          },
        });
        logStep({
          correlationId,
          scope: 'api.mark-received',
          step: 'nextPeriod.lookup.done',
          verbose: true,
          data: {
            paymentId,
            nextYear: nextMonth.getFullYear(),
            nextMonth: nextMonth.getMonth() + 1,
            found: Boolean(nextPeriod),
            nextPeriodLookupMs: nextPeriodLookupTimer.ms(),
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

        logStep({
          correlationId,
          scope: 'api.mark-received',
          step: 'nextPaymentDate.calculate.done',
          verbose: true,
          data: { paymentId, nextPaymentDate, cutoffDay },
        });
      }
    } catch (receiptError) {
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'receipt_or_dates.error',
        level: 'error',
        data: {
          paymentId,
          elapsedMs: t.ms(),
          error: receiptError instanceof Error ? { name: receiptError.name, message: receiptError.message, stack: receiptError.stack } : receiptError,
        },
      });
      // Continuar sin recibo
    }

    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'response.ok',
      verbose: true,
      data: {
        paymentId,
        receiptId,
        hasReceiptUrl: Boolean(receiptUrl),
        totalMs: t.ms(),
      },
    });

    const res = NextResponse.json({
      success: true,
      message: 'Pago marcado como recibido exitosamente',
      payment: updatedPayment,
      receiptId,
      receiptUrl,
      nextPaymentDate,
      periodName
    });
    res.headers.set('x-correlation-id', correlationId);
    return res;

  } catch (error) {
    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'handler.error',
      level: 'error',
      data: {
        elapsedMs: t.ms(),
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      },
    });
    
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
