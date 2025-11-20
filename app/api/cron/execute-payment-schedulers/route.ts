import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentSchedulerService } from '@/lib/payment-scheduler-service';

// GET /api/cron/execute-payment-schedulers - Endpoint para ejecutar schedulers de pago desde GitHub Actions
export async function GET(request: NextRequest) {
  try {
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
    // Verificar solo día del mes y hora (sin considerar minutos)
    const schedulersToExecute = activeSchedulers.filter(scheduler => {
      // Verificar día del mes (permitir ejecución en el día configurado)
      const dayMatches = scheduler.dayOfMonth === currentDay;
      
      if (!dayMatches) {
        console.log(`⏭️  Scheduler ${scheduler.name}: día no coincide (configurado: ${scheduler.dayOfMonth}, actual: ${currentDay})`);
        return false;
      }
      
      // Verificar solo la hora (sin considerar minutos)
      // El scheduler debe ejecutarse en esta hora específica
      if (scheduler.hour !== currentHour) {
        console.log(`⏭️  Scheduler ${scheduler.name}: hora no coincide (configurado: ${scheduler.hour}:${scheduler.minute}, actual: ${currentHour}:${currentMinute})`);
        return false;
      }
      
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
          console.log(`⏭️  Scheduler ${scheduler.name} ya se ejecutó hoy a las ${lastExecutedDate.toLocaleTimeString()}, omitiendo`);
          return false;
        }
      }
      
      console.log(`✅ Scheduler ${scheduler.name} debe ejecutarse ahora (día: ${currentDay}, hora: ${currentHour})`);
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
        console.log(`   📅 Configurado para: día ${scheduler.dayOfMonth}, hora ${scheduler.hour}:${scheduler.minute.toString().padStart(2, '0')}`);
        
        // Ejecutar el scheduler (esto crea la ejecución y actualiza estadísticas internamente)
        await schedulerService.executeSchedulerById(scheduler.id);
        
        // Obtener la última ejecución para reportar resultados
        const lastExecution = await prisma.schedulerExecution.findFirst({
          where: { schedulerId: scheduler.id },
          orderBy: { startedAt: 'desc' }
        });

        if (lastExecution) {
          const sent = lastExecution.sentMessages || 0;
          const failed = lastExecution.failedMessages || 0;
          const total = lastExecution.totalMessages || 0;
          
          totalSent += sent;
          totalFailed += failed;
          totalExecutions++;

          console.log(`   ✅ Scheduler ejecutado: ${sent} enviados, ${failed} fallidos de ${total} totales`);
          if (failed > 0) {
            console.log(`   ⚠️  ${failed} mensajes no pudieron enviarse`);
          }

          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            executionId: lastExecution.id,
            status: lastExecution.status,
            sent,
            failed,
            total,
            startedAt: lastExecution.startedAt,
            completedAt: lastExecution.completedAt,
            errorMessage: lastExecution.errorMessage || null
          });
        } else {
          // Si no hay ejecución registrada, el scheduler se ejecutó pero no creó registro
          console.log(`   ⚠️  Scheduler ejecutado pero sin registro de ejecución`);
          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            status: 'COMPLETED',
            note: 'Ejecutado exitosamente pero sin registro de ejecución'
          });
        }

      } catch (error) {
        console.error(`❌ Error ejecutando scheduler ${scheduler.id} (${scheduler.name}):`, error);
        
        // Obtener la última ejecución para ver si se creó antes del error
        const lastExecution = await prisma.schedulerExecution.findFirst({
          where: { schedulerId: scheduler.id },
          orderBy: { startedAt: 'desc' }
        });

        if (lastExecution && lastExecution.status === 'FAILED') {
          const sent = lastExecution.sentMessages || 0;
          const failed = lastExecution.failedMessages || 0;
          const total = lastExecution.totalMessages || 0;
          
          totalSent += sent;
          totalFailed += failed;
          
          console.log(`   ❌ Scheduler falló: ${sent} enviados, ${failed} fallidos de ${total} totales`);
          console.log(`   🔴 Error: ${lastExecution.errorMessage || (error instanceof Error ? error.message : 'Error desconocido')}`);
          
          results.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            executionId: lastExecution.id,
            status: 'FAILED',
            error: lastExecution.errorMessage || (error instanceof Error ? error.message : 'Error desconocido'),
            sent,
            failed,
            total
          });
        } else {
          console.log(`   🔴 Error crítico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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

    console.log(`\n📊 ===== RESUMEN FINAL =====`);
    console.log(`✅ Cron job completado en ${duration}ms`);
    console.log(`📋 Schedulers activos: ${activeSchedulers.length}`);
    console.log(`⚡ Schedulers a ejecutar: ${schedulersToExecute.length}`);
    console.log(`🚀 Schedulers ejecutados: ${totalExecutions}`);
    console.log(`✅ Mensajes enviados exitosamente: ${totalSent}`);
    console.log(`❌ Mensajes que no se pudieron enviar: ${totalFailed}`);
    console.log(`📈 Total de mensajes procesados: ${totalSent + totalFailed}`);
    console.log(`===========================\n`);

    return NextResponse.json({
      message: totalExecutions > 0 
        ? 'Cron job de Payment Schedulers ejecutado exitosamente'
        : 'No hay schedulers programados para ejecutarse en este momento',
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
        totalFailed,
        totalProcessed: totalSent + totalFailed
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

