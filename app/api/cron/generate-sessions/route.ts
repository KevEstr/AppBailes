import { NextRequest, NextResponse } from 'next/server';
import { ClassSessionService } from '@/lib/class-session-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/cron/generate-sessions - Endpoint para generar sesiones automáticamente
export async function GET(request: NextRequest) {
  try {
    // Verificar que la llamada sea desde un cron job autorizado
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // En desarrollo, permitir sin autenticación si no hay CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Acceso no autorizado al cron job');
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Log de la ejecución
    console.log('🔐 Cron job autorizado, procediendo con la generación...');

    console.log('🕐 Ejecutando cron job de generación de sesiones...');
    const startTime = new Date();

    // Obtener todas las clases activas con sus horarios
    const activeClasses = await prisma.danceClass.findMany({
      where: {
        isActive: true
      },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });

    console.log(`📚 Encontradas ${activeClasses.length} clases activas`);

    const sessionService = new ClassSessionService(prisma);
    let totalSessionsGenerated = 0;
    const results = [];

    for (const danceClass of activeClasses) {
      if (danceClass.schedules.length === 0) {
        console.log(`⚠️ Clase ${danceClass.name} no tiene horarios activos, saltando...`);
        continue;
      }

      try {
        // Verificar cuántas sesiones futuras tiene esta clase
        const futureSessions = await prisma.classSession.count({
          where: {
            classId: danceClass.id,
            date: {
              gte: new Date()
            }
          }
        });

        // Si tiene menos de 4 semanas de sesiones (28 días), generar más
        const weeksNeeded = Math.max(0, 4 - Math.ceil(futureSessions / danceClass.schedules.length));
        
        if (weeksNeeded > 0) {
          console.log(`🔄 Generando ${weeksNeeded} semanas adicionales para clase: ${danceClass.name}`);
          
          const result = await sessionService.generateSessionsForClass({
            classId: danceClass.id,
            schedules: danceClass.schedules,
            startDate: new Date(),
            weeksToGenerate: weeksNeeded
          });

          totalSessionsGenerated += result.totalSessions;
          results.push({
            classId: danceClass.id,
            className: danceClass.name,
            sessionsGenerated: result.totalSessions,
            weeksGenerated: weeksNeeded
          });

          console.log(`✅ Clase ${danceClass.name}: ${result.totalSessions} sesiones generadas`);
        } else {
          console.log(`✅ Clase ${danceClass.name}: ya tiene suficientes sesiones futuras`);
        }
      } catch (error) {
        console.error(`❌ Error generando sesiones para clase ${danceClass.name}:`, error);
        results.push({
          classId: danceClass.id,
          className: danceClass.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`✅ Cron job completado: ${totalSessionsGenerated} sesiones generadas en ${duration}ms`);

    return NextResponse.json({
      message: 'Generación de sesiones completada exitosamente',
      timestamp: startTime.toISOString(),
      duration: `${duration}ms`,
      totalSessionsGenerated,
      classesProcessed: activeClasses.length,
      results,
      note: 'Sistema de generación automática de sesiones ejecutado'
    });

  } catch (error) {
    console.error('💥 Error en cron job de generación de sesiones:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
