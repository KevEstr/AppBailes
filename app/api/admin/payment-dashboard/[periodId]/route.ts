import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/payment-dashboard/[periodId] - Dashboard de pagos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId: periodIdStr } = await params;
    const periodId = parseInt(periodIdStr);
    
    if (isNaN(periodId)) {
      return NextResponse.json(
        { message: 'ID de período inválido' },
        { status: 400 }
      );
    }

    const dashboard = await monthlyPaymentService.getPaymentDashboard(periodId);
    
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    
    if (error instanceof Error && error.message === 'Período no encontrado') {
      return NextResponse.json(
        { message: 'Período no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 