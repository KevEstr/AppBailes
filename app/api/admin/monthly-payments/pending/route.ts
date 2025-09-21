import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || undefined;

    if (!periodId) {
      return NextResponse.json(
        { message: 'ID de período es requerido' },
        { status: 400 }
      );
    }

    // Validar parámetros
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: 'Parámetros de paginación inválidos' },
        { status: 400 }
      );
    }

    const result = await monthlyPaymentService.getPendingPayments(parseInt(periodId), {
      page,
      limit,
      search
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error obteniendo pagos pendientes:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Período no encontrado') {
        return NextResponse.json(
          { message: 'Período no encontrado' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
