import { NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/payment-proofs/pending - Comprobantes pendientes
export async function GET() {
  try {
    const pendingProofs = await monthlyPaymentService.getPendingProofs();
    
    return NextResponse.json(pendingProofs);
  } catch (error) {
    console.error('Error al obtener comprobantes pendientes:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 