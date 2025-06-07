import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/scheduled-whatsapp/test - Verificar envíos programados
export async function GET() {
  try {
    console.log('🔍 Verificando envíos programados...');

    // Obtener todos los envíos programados
    const allScheduled = await prisma.scheduledWhatsAppSend.findMany({
      include: {
        period: true
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    });

    console.log(`📋 Total de envíos programados: ${allScheduled.length}`);

    // Obtener envíos que deberían ejecutarse ahora
    const now = new Date();
    const shouldExecute = allScheduled.filter(send => 
      send.status === 'PENDING' && new Date(send.scheduledDate) <= now
    );

    console.log(`⏰ Envíos que deberían ejecutarse ahora: ${shouldExecute.length}`);

    return NextResponse.json({
      message: 'Información de envíos programados',
      totalScheduled: allScheduled.length,
      shouldExecuteNow: shouldExecute.length,
      allScheduled: allScheduled.map(s => ({
        id: s.id,
        name: s.name,
        scheduledDate: s.scheduledDate,
        status: s.status,
        period: s.period.name,
        shouldExecuteNow: s.status === 'PENDING' && new Date(s.scheduledDate) <= now
      })),
      currentTime: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Error verificando envíos:', error);
    return NextResponse.json(
      { 
        message: 'Error verificando envíos programados',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/scheduled-whatsapp/test - Ejecutar envíos manualmente (FORCE)
export async function POST() {
  try {
    console.log('🚀 EJECUTANDO ENVÍOS PROGRAMADOS MANUALMENTE...');

    // Llamar a la API de ejecución
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const executeUrl = `${baseUrl}/api/admin/scheduled-whatsapp/execute`;
    
    console.log(`📞 Llamando a: ${executeUrl}`);

    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    console.log('📊 Resultado de ejecución:', result);

    return NextResponse.json({
      message: 'Envíos programados ejecutados manualmente',
      timestamp: new Date().toISOString(),
      executeResult: result,
      apiResponse: {
        status: response.status,
        ok: response.ok
      }
    });

  } catch (error) {
    console.error('💥 Error ejecutando envíos:', error);
    return NextResponse.json(
      { 
        message: 'Error ejecutando envíos programados',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 