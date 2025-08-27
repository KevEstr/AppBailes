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
    // Generar o regenerar formularios para esos pagos pendientes
    const forms = await monthlyPaymentService.generatePaymentForms(periodId, { regenerate: !!regenerate });

    return NextResponse.json({
      success: true,
      generated: forms.length,
      existing: 0,
      message: regenerate ? `Se regeneraron ${forms.length} formularios.` : `Se generaron ${forms.length} formularios.`
    });

  } catch (error) {
    console.error('Error generando formularios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 