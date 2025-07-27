import { NextRequest, NextResponse } from 'next/server';
import { paymentSchedulerService } from '@/lib/payment-scheduler-service';

// PUT /api/admin/payment-scheduler/[id] - Actualizar scheduler
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedulerId = parseInt(id);
    
    if (isNaN(schedulerId)) {
      return NextResponse.json(
        { error: 'ID de scheduler inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validaciones si se proporcionan
    if (body.hour !== undefined && (body.hour < 0 || body.hour > 23)) {
      return NextResponse.json(
        { error: 'La hora debe estar entre 0 y 23' },
        { status: 400 }
      );
    }

    if (body.minute !== undefined && (body.minute < 0 || body.minute > 59)) {
      return NextResponse.json(
        { error: 'Los minutos deben estar entre 0 y 59' },
        { status: 400 }
      );
    }

    if (body.dayOfMonth !== undefined && body.dayOfMonth !== null && 
        (body.dayOfMonth < 1 || body.dayOfMonth > 31)) {
      return NextResponse.json(
        { error: 'El día del mes debe estar entre 1 y 31' },
        { status: 400 }
      );
    }

    const scheduler = await paymentSchedulerService.updateScheduler(schedulerId, body);

    return NextResponse.json({
      message: 'Scheduler actualizado exitosamente',
      scheduler
    });
  } catch (error) {
    console.error('Error actualizando scheduler:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Scheduler no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error actualizando scheduler',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/payment-scheduler/[id] - Eliminar scheduler
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedulerId = parseInt(id);
    
    if (isNaN(schedulerId)) {
      return NextResponse.json(
        { error: 'ID de scheduler inválido' },
        { status: 400 }
      );
    }

    await paymentSchedulerService.deleteScheduler(schedulerId);

    return NextResponse.json({
      message: 'Scheduler eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando scheduler:', error);
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Scheduler no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error eliminando scheduler',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
