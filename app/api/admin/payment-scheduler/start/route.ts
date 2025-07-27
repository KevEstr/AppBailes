import { NextRequest, NextResponse } from 'next/server';
import { paymentSchedulerService } from '@/lib/payment-scheduler-service';

// POST /api/admin/payment-scheduler/start - Iniciar el sistema de scheduler
export async function POST() {
  try {
    paymentSchedulerService.start();
    
    return NextResponse.json({
      message: 'Sistema de scheduler iniciado exitosamente',
      status: paymentSchedulerService.getStatus(),
      diagnostics: paymentSchedulerService.getDiagnostics()
    });
  } catch (error) {
    console.error('Error iniciando scheduler:', error);
    return NextResponse.json(
      { 
        error: 'Error iniciando sistema de scheduler',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/payment-scheduler/start - Detener el sistema de scheduler
export async function DELETE() {
  try {
    paymentSchedulerService.stop();
    
    return NextResponse.json({
      message: 'Sistema de scheduler detenido exitosamente',
      status: paymentSchedulerService.getStatus()
    });
  } catch (error) {
    console.error('Error deteniendo scheduler:', error);
    return NextResponse.json(
      { 
        error: 'Error deteniendo sistema de scheduler',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/payment-scheduler/start - Recargar schedulers manualmente
export async function PUT() {
  try {
    await paymentSchedulerService.reloadSchedulers();
    
    return NextResponse.json({
      message: 'Schedulers recargados exitosamente',
      status: paymentSchedulerService.getStatus(),
      note: 'Esta función solo es necesaria si se modificaron schedulers externamente'
    });
  } catch (error) {
    console.error('Error recargando schedulers:', error);
    return NextResponse.json(
      { 
        error: 'Error recargando schedulers',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
