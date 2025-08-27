import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/monthly-fee - Obtener configuración actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') as 'DANCE' | 'VOLLEYBALL' | null;

    if (sport === 'DANCE' || sport === 'VOLLEYBALL') {
      const fee = await monthlyPaymentService.getCurrentMonthlyFee(sport);
      if (!fee) {
        return NextResponse.json(
          { message: `No hay configuración activa para ${sport}` },
          { status: 404 }
        );
      }
      return NextResponse.json(fee);
    }

    // Sin filtro: devolver últimas por deporte
    const fees = await monthlyPaymentService.getLatestFeesBySport();
    return NextResponse.json(fees);
  } catch (error) {
    console.error('Error al obtener configuración de mensualidad:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/monthly-fee - Establecer nueva mensualidad
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { amount, description, validFrom, sport } = body;

    // Validaciones
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { message: 'El monto debe ser un número positivo' },
        { status: 400 }
      );
    }
    if (sport !== 'DANCE' && sport !== 'VOLLEYBALL') {
      return NextResponse.json(
        { message: 'El campo sport es requerido y debe ser DANCE o VOLLEYBALL' },
        { status: 400 }
      );
    }

    const newFeeConfig = await monthlyPaymentService.setMonthlyFee({
      amount,
      description,
      createdBy: 'admin@academia.com', // En producción, obtener del usuario autenticado
      validFrom: validFrom ? new Date(validFrom) : undefined,
      sport
    });

    return NextResponse.json(newFeeConfig, { status: 201 });
  } catch (error) {
    console.error('Error al configurar mensualidad:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 