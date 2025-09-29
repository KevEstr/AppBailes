import { NextRequest, NextResponse } from 'next/server';
import { paymentSchedulerService } from '@/lib/payment-scheduler-service';

// GET /api/admin/payment-scheduler - Obtener todos los schedulers
export async function GET() {
  try {
    const schedulers = await paymentSchedulerService.getSchedulers();
    const status = paymentSchedulerService.getStatus();
    
    return NextResponse.json({
      schedulers,
      systemStatus: status
    });
  } catch (error) {
    console.error('Error obteniendo schedulers:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo schedulers',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/payment-scheduler - Crear nuevo scheduler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validaciones
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      );
    }

    if (body.hour < 0 || body.hour > 23) {
      return NextResponse.json(
        { error: 'La hora debe estar entre 0 y 23' },
        { status: 400 }
      );
    }

    if (body.minute < 0 || body.minute > 59) {
      return NextResponse.json(
        { error: 'Los minutos deben estar entre 0 y 59' },
        { status: 400 }
      );
    }

    if (body.isRecurring && body.dayOfMonth && (body.dayOfMonth < 1 || body.dayOfMonth > 31)) {
      return NextResponse.json(
        { error: 'El día del mes debe estar entre 1 y 31' },
        { status: 400 }
      );
    }

    // Construir customFilter con cutoffGroup si viene
    let customFilter = body.customFilter;
    if (body.cutoffGroup && ['ALL','15','30'].includes(body.cutoffGroup)) {
      try {
        const base = typeof customFilter === 'string' && customFilter?.trim() ? JSON.parse(customFilter) : {};
        customFilter = JSON.stringify({ ...base, cutoffGroup: body.cutoffGroup });
      } catch {
        customFilter = JSON.stringify({ cutoffGroup: body.cutoffGroup });
      }
    }

    const scheduler = await paymentSchedulerService.createScheduler({
      name: body.name,
      description: body.description,
      dayOfMonth: body.dayOfMonth,
      hour: body.hour || 9,
      minute: body.minute || 0,
      schedulerType: body.schedulerType || 'MONTHLY_PAYMENT',
      targetFilter: body.targetFilter || 'ALL_ACTIVE',
      customFilter,
      createdBy: 'admin' // TODO: obtener del usuario autenticado
    });

    return NextResponse.json({
      message: 'Scheduler creado exitosamente',
      scheduler
    });
  } catch (error) {
    console.error('Error creando scheduler:', error);
    return NextResponse.json(
      { 
        error: 'Error creando scheduler',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
