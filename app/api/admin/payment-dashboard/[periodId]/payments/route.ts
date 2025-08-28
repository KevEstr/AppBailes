import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/payment-dashboard/[periodId]/payments - Obtener pagos con paginación
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

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || undefined;

    // Validar parámetros
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: 'Parámetros de paginación inválidos' },
        { status: 400 }
      );
    }

    const payments = await monthlyPaymentService.getPaymentsWithPagination(periodId, {
      page,
      limit,
      search
    });
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    
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
