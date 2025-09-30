import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassSessionService } from '@/lib/class-session-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/admin/generate-sessions-bulk - Generar sesiones masivamente
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede generar sesiones masivamente
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { weeksToGenerate = 8, classId = null } = body; // 8 semanas = 2 meses

    console.log('🚀 Iniciando generación masiva de sesiones...');
    console.log(`📅 Semanas a generar: ${weeksToGenerate}`);
    console.log(`🎯 Clase específica: ${classId || 'Todas las clases'}`);

    // Obtener clases activas
    const whereClause = {
      isActive: true,
      ...(classId && { id: classId })
    };

    const activeClasses = await prisma.danceClass.findMany({
      where: whereClause,
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });

    if (activeClasses.length === 0) {
      return NextResponse.json({ 
        error: "No se encontraron clases activas",
        classesFound: 0
      }, { status: 404 });
    }

    console.log(`📚 Encontradas ${activeClasses.length} clases activas`);

    const sessionService = new ClassSessionService(prisma);
    let totalSessionsGenerated = 0;
    const results = [];

    for (const danceClass of activeClasses) {
      if (danceClass.schedules.length === 0) {
        console.log(`⚠️ Clase ${danceClass.name} no tiene horarios activos, saltando...`);
        results.push({
          classId: danceClass.id,
          className: danceClass.name,
          error: 'No tiene horarios activos'
        });
        continue;
      }

      try {
        console.log(`🔄 Generando sesiones para clase: ${danceClass.name}`);
        
        const result = await sessionService.generateSessionsForClass({
          classId: danceClass.id,
          schedules: danceClass.schedules,
          startDate: new Date(),
          weeksToGenerate: weeksToGenerate
        });

        totalSessionsGenerated += result.totalSessions;
        results.push({
          classId: danceClass.id,
          className: danceClass.name,
          sessionsGenerated: result.totalSessions,
          weeksGenerated: weeksToGenerate,
          success: true
        });

        console.log(`✅ Clase ${danceClass.name}: ${result.totalSessions} sesiones generadas`);
      } catch (error) {
        console.error(`❌ Error generando sesiones para clase ${danceClass.name}:`, error);
        results.push({
          classId: danceClass.id,
          className: danceClass.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false
        });
      }
    }

    const successfulClasses = results.filter(r => r.success).length;
    const failedClasses = results.filter(r => !r.success).length;

    console.log(`🎉 Generación masiva completada:`);
    console.log(`✅ Clases exitosas: ${successfulClasses}`);
    console.log(`❌ Clases fallidas: ${failedClasses}`);
    console.log(`📊 Total sesiones generadas: ${totalSessionsGenerated}`);

    return NextResponse.json({
      success: true,
      message: `Generación masiva completada: ${totalSessionsGenerated} sesiones generadas`,
      summary: {
        totalClasses: activeClasses.length,
        successfulClasses,
        failedClasses,
        totalSessionsGenerated,
        weeksGenerated: weeksToGenerate
      },
      results
    });

  } catch (error) {
    console.error('💥 Error en generación masiva:', error);
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

// GET /api/admin/generate-sessions-bulk - Obtener estadísticas
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Obtener estadísticas de sesiones
    const totalSessions = await prisma.classSession.count();
    const futureSessions = await prisma.classSession.count({
      where: {
        date: {
          gte: new Date()
        }
      }
    });

    // Obtener clases con estadísticas
    const classesWithStats = await prisma.danceClass.findMany({
      where: {
        isActive: true
      },
      include: {
        schedules: {
          where: { isActive: true }
        },
        _count: {
          select: {
            sessions: {
              where: {
                date: {
                  gte: new Date()
                }
              }
            }
          }
        }
      }
    });

    const classesStats = classesWithStats.map(cls => ({
      id: cls.id,
      name: cls.name,
      sport: cls.sport,
      schedulesCount: cls.schedules.length,
      futureSessionsCount: cls._count.sessions,
      weeksAhead: Math.ceil(cls._count.sessions / cls.schedules.length)
    }));

    return NextResponse.json({
      success: true,
      statistics: {
        totalSessions,
        futureSessions,
        classesCount: classesWithStats.length
      },
      classes: classesStats
    });

  } catch (error) {
    console.error('Error getting session statistics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
