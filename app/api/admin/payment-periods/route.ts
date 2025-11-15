import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/payment-periods - Obtener períodos
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    const periods = await prisma.paymentPeriod.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error al obtener períodos:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/payment-periods - Crear período
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month } = body;

    // Validaciones
    if (!year || !month) {
      return NextResponse.json(
        { message: 'Año y mes son obligatorios' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: 'El mes debe estar entre 1 y 12' },
        { status: 400 }
      );
    }

    const period = await monthlyPaymentService.createPaymentPeriod({
      year: parseInt(year),
      month: parseInt(month)
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error('Error al crear período:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { message: 'Ya existe un período para este año y mes' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 