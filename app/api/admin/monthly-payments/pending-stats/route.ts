import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    if (!periodId) {
      return NextResponse.json(
        { error: 'periodId es requerido' },
        { status: 400 }
      );
    }

    // Obtener estadísticas de pagos pendientes
    const pendingStats = await monthlyPaymentService.getPendingPaymentsStats(parseInt(periodId));

    return NextResponse.json(pendingStats);
  } catch (error) {
    console.error('Error obteniendo estadísticas de pagos pendientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
