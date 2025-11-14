import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentSchedulerService } from '@/lib/payment-scheduler-service';

// GET /api/cron/execute-payment-schedulers - Endpoint para ejecutar schedulers de pago desde GitHub Actions
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

    console.log('🕐 Ejecutando cron job de Payment Schedulers...');
    const startTime = new Date();
    const currentHour = startTime.getHours();
    const currentMinute = startTime.getMinutes();
    const currentDay = startTime.getDate();
    const currentMonth = startTime.getMonth() + 1;
    const currentYear = startTime.getFullYear();

    // Obtener todos los schedulers activos
    const activeSchedulers = await prisma.paymentScheduler.findMany({
      where: { 
        isActive: true
      },
      orderBy: { dayOfMonth: 'asc' }
    });

    console.log(`📋 Encontrados ${activeSchedulers.length} schedulers activos`);

    // Filtrar schedulers que deben ejecutarse ahora
    // Verificar si el día del mes, hora y minuto coinciden
    const schedulersToExecute = activeSchedulers.filter(scheduler => {
      // Verificar día del mes (permitir ejecución en el día configurado)
      const dayMatches = scheduler.dayOfMonth === currentDay;
      
      if (!dayMatches) return false;
      
      // Verificar hora y minuto
      // El scheduler debe ejecutarse en esta hora específica
      if (scheduler.hour !== currentHour) return false;
      
      // Verificar minuto: ejecutar si el minuto configurado ya pasó o está en el rango actual
      // Con tolerancia hacia atrás de 15 minutos (porque el workflow se ejecuta cada 15 min)
      // Ejemplo: si el workflow se ejecuta a las 9:15, puede ejecutar schedulers de 9:00 a 9:15
      const minuteDiff = currentMinute - scheduler.minute;
      const minuteMatches = minuteDiff >= 0 && minuteDiff <= 15; // El minuto ya pasó y está dentro de la ventana
      
      if (!minuteMatches) return false;
      
      // Evitar ejecuciones duplicadas: verificar si ya se ejecutó hoy
      if (scheduler.lastExecuted) {
        const lastExecutedDate = new Date(scheduler.lastExecuted);
        const lastExecutedDay = lastExecutedDate.getDate();
        const lastExecutedMonth = lastExecutedDate.getMonth() + 1;
        const lastExecutedYear = lastExecutedDate.getFullYear();
        
        // Si ya se ejecutó hoy, no ejecutar de nuevo
        if (lastExecutedDay === currentDay && 
            lastExecutedMonth === currentMonth && 
            lastExecutedYear === currentYear) {
          console.log(`⏭️  Scheduler ${scheduler.name} ya se ejecutó hoy, omitiendo`);
          return false;
        }
      }
      
      return true;
    });

    console.log(`⚡ ${schedulersToExecute.length} scheduler(s) deben ejecutarse ahora`);

    if (schedulersToExecute.length === 0) {
      return NextResponse.json({
        message: 'No hay schedulers programados para ejecutarse en este momento',
        timestamp: startTime.toISOString(),
        currentTime: {
          day: currentDay,
          hour: currentHour,
          minute: currentMinute,
          month: currentMonth,
          year: currentYear
        },
        activeSchedulers: activeSchedulers.length,
        executed: 0
      });
    }

    // Obtener instancia del servicio
    const schedulerService = PaymentSchedulerService.getInstance();
    
    const results = [];
    let totalSent = 0;
    let totalFailed = 0;
    let totalExecutions = 0;

    // Ejecutar cada scheduler que debe ejecutarse
    for (const scheduler of schedulersToExecute) {
      try {
        console.log(`🚀 Ejecutando scheduler: ${scheduler.name} (ID: ${scheduler.id})`);
        
        // Ejecutar el scheduler (esto crea la ejecución y actualiza estadísticas internamente)
        await schedulerService.executeSchedulerById(scheduler.id);
        
        // Obtener la última ejecución para reportar resultados
        const lastExecution = await prisma.schedulerExecution.findFirst({
          where: { schedulerId: scheduler.id },
          orderBy: { startedAt: 'desc' }
        });

        if (lastExecution) {
          totalSent += lastExecution.sentMessages || 0;
          totalFailed += lastExecution.failedMessages || 0;
          totalExecutions++;

          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            executionId: lastExecution.id,
            status: lastExecution.status,
            sent: lastExecution.sentMessages || 0,
            failed: lastExecution.failedMessages || 0,
            total: lastExecution.totalMessages || 0,
            startedAt: lastExecution.startedAt,
            completedAt: lastExecution.completedAt
          });
        } else {
          // Si no hay ejecución registrada, el scheduler se ejecutó pero no creó registro
          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            status: 'COMPLETED',
            note: 'Ejecutado exitosamente pero sin registro de ejecución'
          });
        }

      } catch (error) {
        console.error(`❌ Error ejecutando scheduler ${scheduler.id}:`, error);
        
        // Obtener la última ejecución para ver si se creó antes del error
        const lastExecution = await prisma.schedulerExecution.findFirst({
          where: { schedulerId: scheduler.id },
          orderBy: { startedAt: 'desc' }
        });

        if (lastExecution && lastExecution.status === 'FAILED') {
          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            executionId: lastExecution.id,
            status: 'FAILED',
            error: lastExecution.errorMessage || (error instanceof Error ? error.message : 'Error desconocido'),
            sent: lastExecution.sentMessages || 0,
            failed: lastExecution.failedMessages || 0,
            total: lastExecution.totalMessages || 0
          });
        } else {
          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`✅ Cron job completado: ${totalExecutions} ejecuciones, ${totalSent} enviados, ${totalFailed} fallidos`);

    return NextResponse.json({
      message: 'Cron job de Payment Schedulers ejecutado exitosamente',
      timestamp: startTime.toISOString(),
      duration: `${duration}ms`,
      currentTime: {
        day: currentDay,
        hour: currentHour,
        minute: currentMinute,
        month: currentMonth,
        year: currentYear
      },
      summary: {
        activeSchedulers: activeSchedulers.length,
        schedulersToExecute: schedulersToExecute.length,
        executed: totalExecutions,
        totalSent,
        totalFailed
      },
      results
    });

  } catch (error) {
    console.error('💥 Error en cron job de Payment Schedulers:', error);
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

// POST /api/cron/execute-payment-schedulers - También permitir POST
export async function POST(request: NextRequest) {
  return GET(request);
}

