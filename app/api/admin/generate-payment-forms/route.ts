import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MonthlyPaymentService } from '@/lib/monthly-payment-service';

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
    const monthlyPaymentService = new MonthlyPaymentService();
    const result = await monthlyPaymentService.generateMonthlyPayments(periodId, regenerate);

    return NextResponse.json({
      success: true,
      created: result.created.length,
      updated: result.updated.length,
      total: result.total,
      message: `Proceso completado: ${result.created.length} pagos creados, ${result.updated.length} pagos actualizados. Los mensajes de WhatsApp se pueden enviar desde el panel de administración.`
    });

  } catch (error) {
    console.error('Error generando formularios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 