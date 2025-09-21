import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

export async function POST(request: NextRequest) {
  try {
    const { periodId, regenerate } = await request.json();

    if (!periodId) {
      return NextResponse.json(
        { message: 'Se requiere el ID del período' },
        { status: 400 }
      );
    }

    // Verificar que el período existe
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json(
        { message: 'Período no encontrado' },
        { status: 404 }
      );
    }

    // Generar pagos mensuales basados en configuración por deporte
    const payments = await monthlyPaymentService.generateMonthlyPayments(periodId);

    return NextResponse.json({
      success: true,
      generated: payments.length,
      existing: 0,
      message: `Se generaron ${payments.length} pagos pendientes. Los mensajes de WhatsApp se pueden enviar desde el panel de administración.`
    });

  } catch (error) {
    console.error('Error generando formularios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 