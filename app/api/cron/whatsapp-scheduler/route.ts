import { NextRequest, NextResponse } from 'next/server';

// GET /api/cron/whatsapp-scheduler - Endpoint para ejecutar automáticamente envíos programados
export async function GET(request: NextRequest) {
  try {
    // Verificar que la llamada sea desde un cron job autorizado
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🕐 Ejecutando cron job de WhatsApp scheduler...');

    // Llamar a la API de ejecución de envíos programados
    const executeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/scheduled-whatsapp/execute`;
    
    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error en cron job:', result);
      return NextResponse.json(
        { message: 'Error ejecutando envíos programados', error: result },
        { status: 500 }
      );
    }

    console.log('✅ Cron job completado:', result);

    return NextResponse.json({
      message: 'Cron job ejecutado exitosamente',
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('💥 Error en cron job de WhatsApp:', error);
    return NextResponse.json(
      { message: 'Error interno en cron job' },
      { status: 500 }
    );
  }
}

// POST /api/cron/whatsapp-scheduler - También permitir POST
export async function POST(request: NextRequest) {
  return GET(request);
} 