import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/monthly-fee - Obtener configuración actual
export async function GET() {
  try {
    const currentFee = await monthlyPaymentService.getCurrentMonthlyFee();
    
    if (!currentFee) {
      return NextResponse.json(
        { message: 'No hay configuración de mensualidad activa' },
        { status: 404 }
      );
    }

    return NextResponse.json(currentFee);
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
    
    const { amount, description, validFrom } = body;

    // Validaciones
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { message: 'El monto debe ser un número positivo' },
        { status: 400 }
      );
    }

    const newFeeConfig = await monthlyPaymentService.setMonthlyFee({
      amount,
      description,
      createdBy: 'admin@academia.com', // En producción, obtener del usuario autenticado
      validFrom: validFrom ? new Date(validFrom) : undefined
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