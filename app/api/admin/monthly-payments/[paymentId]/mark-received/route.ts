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

  // Parsear paymentId fuera del try para que esté disponible en el catch
  const { paymentId: paymentIdParam } = await params;
  const paymentId = Number.parseInt(paymentIdParam);

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
    const serviceResult = await monthlyPaymentService.markPaymentAsReceived(paymentId, {
      paymentMethod,
      receivedAmount,
      additionalDebt,
      discount,
      markedBy: session.user.id,
      additionalPayment,
      correlationId
    });
    const updatedPayment = serviceResult.payment;
    logStep({
      correlationId,
      scope: 'api.mark-received',
      step: 'service.markPaymentAsReceived.done',
      verbose: true,
      data: {
        paymentId,
        serviceMs: serviceTimer.ms(),
        status: updatedPayment?.status,
        receiptId: serviceResult.receiptId,
      },
    });

    // El recibo ya viene creado atómicamente desde el servicio
    let receiptId: number | null = serviceResult.receiptId;
    let receiptUrl: string | null = receiptId ? DigitalReceiptService.generateReceiptUrl(receiptId) : null;
    let nextPaymentDate: string | null = null;
    let periodName: string | null = null;

    try {
      const sourcePayment = serviceResult.sourcePayment;
      const cutoffDay = serviceResult.cutoffDay;

      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'receipt.lookup.done',
        verbose: true,
        data: { paymentId, receiptId, fromService: true },
      });

      if (sourcePayment?.period) {
        const periodInfo = calculatePaymentPeriodForConcept(
          cutoffDay,
          sourcePayment.period.year,
          sourcePayment.period.month
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
            year: sourcePayment.period.year,
            month: sourcePayment.period.month,
            periodName,
          },
        });

        const currentDate = new Date(sourcePayment.period.year, sourcePayment.period.month - 1, 1);
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

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
    } catch (datesError) {
      logStep({
        correlationId,
        scope: 'api.mark-received',
        step: 'dates.error',
        level: 'warn',
        data: {
          paymentId,
          elapsedMs: t.ms(),
          error: datesError instanceof Error ? { name: datesError.name, message: datesError.message } : datesError,
        },
      });
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
        // Intentar recuperar el recibo existente para que el frontend lo muestre
        const existingReceipt = await prisma.receipt.findFirst({
          where: { monthlyPaymentId: paymentId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        }).catch(() => null);
        const res = NextResponse.json(
          {
            message: 'El pago ya ha sido marcado como recibido',
            existingReceiptId: existingReceipt?.id ?? null,
            existingReceiptUrl: existingReceipt ? DigitalReceiptService.generateReceiptUrl(existingReceipt.id) : null,
          },
          { status: 400 }
        );
        res.headers.set('x-correlation-id', correlationId);
        return res;
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
