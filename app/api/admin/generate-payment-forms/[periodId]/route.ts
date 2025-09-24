import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// POST /api/admin/generate-payment-forms/[periodId] - Generar formularios
export async function POST(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const periodId = parseInt(params.periodId);
    
    if (isNaN(periodId)) {
      return NextResponse.json(
        { message: 'ID de período inválido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const regenerate = searchParams.get('regenerate') === 'true';

    // Generar pagos mensuales si no existen
    const result = await monthlyPaymentService.generateMonthlyPayments(periodId, regenerate);

    return NextResponse.json({
      success: true,
      created: result.created.length,
      updated: result.updated.length,
      total: result.total,
      message: `Proceso completado: ${result.created.length} pagos creados, ${result.updated.length} pagos actualizados. Los mensajes de WhatsApp se pueden enviar desde el panel de administración.`
    });
  } catch (error) {
    console.error('Error al generar formularios:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Período no encontrado') {
        return NextResponse.json(
          { message: 'Período no encontrado' },
          { status: 404 }
        );
      }
      
      if (error.message === 'No hay configuración de mensualidad activa') {
        return NextResponse.json(
          { message: 'Debe configurar el valor de la mensualidad primero' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 