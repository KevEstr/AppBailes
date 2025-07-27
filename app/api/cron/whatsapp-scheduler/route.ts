import { NextRequest, NextResponse } from 'next/server';
import { PaymentSchedulerService } from '@/lib/payment-scheduler-service';

// GET /api/cron/whatsapp-scheduler - Endpoint para ejecutar automáticamente schedulers de pago
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

    console.log('🕐 Ejecutando cron job de Payment Scheduler...');
    const startTime = new Date();

    // Obtener instancia del servicio de scheduler
    const schedulerService = PaymentSchedulerService.getInstance();
    
    // Verificar si el sistema está ejecutándose
    const status = schedulerService.getStatus();
    
    if (!status.isRunning) {
      console.log('⚠️  Sistema de scheduler no está ejecutándose, iniciando...');
      await schedulerService.start();
    }

    // Ejecutar health check manual
    console.log('🔍 Ejecutando health check...');
    await schedulerService.reloadSchedulers();

    // Obtener diagnósticos
    const diagnostics = schedulerService.getDiagnostics();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log('✅ Cron job completado exitosamente');

    return NextResponse.json({
      message: 'Cron job de Payment Scheduler ejecutado exitosamente',
      timestamp: startTime.toISOString(),
      duration: `${duration}ms`,
      status,
      diagnostics,
      note: 'Sistema de schedulers verificado y actualizado'
    });

  } catch (error) {
    console.error('💥 Error en cron job de Payment Scheduler:', error);
    return NextResponse.json(
      { 
        message: 'Error interno en cron job',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/cron/whatsapp-scheduler - También permitir POST
export async function POST(request: NextRequest) {
  return GET(request);
} 